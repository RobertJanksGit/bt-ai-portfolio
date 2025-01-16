import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db, storage } from "../config/firebase";
import { User } from "../types/user";
import { updateUserRole } from "../services/userService";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import toast, { Toaster } from "react-hot-toast";

interface Asset {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrls: string[];
  createdAt: Date;
}

const AssetCard = ({
  asset,
  onEdit,
  onDelete,
}: {
  asset: Asset;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!asset.imageUrls?.length) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === asset.imageUrls.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [asset.imageUrls]);

  return (
    <div className="relative group cursor-pointer">
      <div className="aspect-square overflow-hidden rounded-lg">
        <img
          src={asset.imageUrls?.[currentImageIndex] || "/placeholder-image.jpg"}
          alt={asset.title}
          className="w-full h-full object-cover transition-all duration-500"
          style={{ opacity: 1 }}
        />
      </div>
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-75 transition-opacity duration-300 rounded-lg flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 text-white p-4 text-center">
          <h3 className="text-lg font-semibold mb-3">{asset.title}</h3>
          <div className="flex flex-col space-y-2">
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              View Project
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white transition-colors duration-200"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm text-white transition-colors duration-200"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assetForm, setAssetForm] = useState({
    title: "",
    description: "",
    url: "",
    images: [] as File[],
    existingImages: [] as string[],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        const usersCollection = collection(db, "users");
        const userSnapshot = await getDocs(usersCollection);
        const userList = userSnapshot.docs.map((doc) => doc.data() as User);
        setUsers(userList);

        // Fetch assets
        const assetsCollection = collection(db, "assets");
        const assetSnapshot = await getDocs(assetsCollection);
        const assetList = assetSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          imageUrls: doc.data().imageUrls || [],
          createdAt: doc.data().createdAt?.toDate(),
        })) as Asset[];
        setAssets(assetList);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRoleChange = async (uid: string, newRole: "user" | "admin") => {
    try {
      await updateUserRole(uid, newRole);
      setUsers(
        users.map((user) =>
          user.uid === uid ? { ...user, role: newRole } : user
        )
      );
      toast.success("User role updated successfully");
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role");
    }
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      const loadingToast = toast.loading("Deleting asset...");
      try {
        // Delete from Firestore
        await deleteDoc(doc(db, "assets", asset.id));

        // Delete from Storage if there's an image
        if (asset.imageUrls.length > 0) {
          const deletePromises = asset.imageUrls.map(async (imageUrl) => {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          });
          await Promise.all(deletePromises);
        }

        // Update local state
        setAssets(assets.filter((a) => a.id !== asset.id));
        toast.success("Asset deleted successfully");
      } catch (error) {
        console.error("Error deleting asset:", error);
        toast.error("Failed to delete asset");
      } finally {
        toast.dismiss(loadingToast);
      }
    }
  };

  const handleAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading(
      editingAsset ? "Updating asset..." : "Creating asset..."
    );
    try {
      let imageUrls: string[] = [...(assetForm.existingImages || [])];

      // Upload new images
      if (assetForm.images.length > 0) {
        const uploadPromises = assetForm.images.map(async (image) => {
          const imageRef = ref(storage, `assets/${Date.now()}-${image.name}`);
          const snapshot = await uploadBytes(imageRef, image);
          return getDownloadURL(snapshot.ref);
        });
        const newImageUrls = await Promise.all(uploadPromises);
        imageUrls = [...imageUrls, ...newImageUrls];
      }

      const assetData = {
        title: assetForm.title,
        description: assetForm.description,
        url: assetForm.url,
        imageUrls,
        updatedAt: new Date(),
      };

      if (editingAsset) {
        // Update existing asset
        const assetRef = doc(db, "assets", editingAsset.id);
        await updateDoc(assetRef, assetData);

        setAssets(
          assets.map((asset) =>
            asset.id === editingAsset.id
              ? {
                  ...asset,
                  ...assetData,
                }
              : asset
          )
        );
      } else {
        // Create new asset
        const docRef = await addDoc(collection(db, "assets"), {
          ...assetData,
          createdAt: new Date(),
        });

        const newAsset = {
          id: docRef.id,
          ...assetData,
          createdAt: new Date(),
        };

        setAssets([...assets, newAsset]);
      }

      setAssetForm({
        title: "",
        description: "",
        url: "",
        images: [],
        existingImages: [],
      });
      setEditingAsset(null);
      setIsModalOpen(false);
      toast.success(
        editingAsset
          ? "Asset updated successfully"
          : "Asset created successfully"
      );
    } catch (error) {
      console.error("Error saving asset:", error);
      toast.error("Failed to save asset. Please try again.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setAssetForm({
      title: asset.title,
      description: asset.description,
      url: asset.url,
      images: [],
      existingImages: asset.imageUrls || [],
    });
    setIsModalOpen(true);
  };

  const handleDeleteImage = async (imageUrl: string, assetId: string) => {
    try {
      // Delete from Storage
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);

      // Update Firestore document
      const assetRef = doc(db, "assets", assetId);
      await updateDoc(assetRef, {
        imageUrls: assetForm.existingImages.filter((url) => url !== imageUrl),
      });

      // Update form state
      setAssetForm({
        ...assetForm,
        existingImages: assetForm.existingImages.filter(
          (url) => url !== imageUrl
        ),
      });

      toast.success("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  };

  const openCreateModal = () => {
    setEditingAsset(null);
    setAssetForm({
      title: "",
      description: "",
      url: "",
      images: [],
      existingImages: [],
    });
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAssetForm((prev) => ({
        ...prev,
        images: [...prev.images, ...newFiles],
      }));
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />
      <Navbar />
      <div className="p-4">
        <div className="p-4 mt-14">
          <div className="bg-white dark:bg-gray-800 relative shadow-md sm:rounded-lg overflow-hidden mb-6">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Assets
                </h2>
                <button
                  onClick={openCreateModal}
                  className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                >
                  Create New Asset
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {assets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onEdit={() => handleEditAsset(asset)}
                    onDelete={() => handleDeleteAsset(asset)}
                  />
                ))}
              </div>
            </div>
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {editingAsset ? "Edit Asset" : "Create New Asset"}
                  </h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleAssetSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={assetForm.title}
                      onChange={(e) =>
                        setAssetForm({ ...assetForm, title: e.target.value })
                      }
                      required
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={assetForm.description}
                      onChange={(e) =>
                        setAssetForm({
                          ...assetForm,
                          description: e.target.value,
                        })
                      }
                      required
                      rows={3}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Project URL
                    </label>
                    <input
                      type="url"
                      value={assetForm.url}
                      onChange={(e) =>
                        setAssetForm({ ...assetForm, url: e.target.value })
                      }
                      required
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Images
                    </label>
                    {/* Existing Images */}
                    {assetForm.existingImages.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        {assetForm.existingImages.map((imageUrl, index) => (
                          <div key={imageUrl} className="relative group">
                            <img
                              src={imageUrl}
                              alt={`Image ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteImage(
                                  imageUrl,
                                  editingAsset?.id || ""
                                )
                              }
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* New Images Input */}
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                      />
                      {/* New Image Previews */}
                      {assetForm.images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                          {Array.from(assetForm.images).map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={URL.createObjectURL(image)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newImages = Array.from(
                                    assetForm.images
                                  );
                                  newImages.splice(index, 1);
                                  setAssetForm({
                                    ...assetForm,
                                    images: newImages,
                                  });
                                }}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                    >
                      {editingAsset ? "Update Asset" : "Create Asset"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 relative shadow-md sm:rounded-lg overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4">
              <div className="w-full">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  User Management
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Role
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Last Login
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.uid}
                      className="border-b dark:border-gray-700"
                    >
                      <td className="px-4 py-3">{user.name}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.role}</td>
                      <td className="px-4 py-3">
                        {user.isActive
                          ? "Now"
                          : user.lastLogin
                          ? new Date(user.lastLogin).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            user.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(
                              user.uid,
                              e.target.value as "user" | "admin"
                            )
                          }
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
