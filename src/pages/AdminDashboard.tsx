import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db, storage } from "../config/firebase";
import { User } from "../types/user";
import { updateUserRole } from "../services/userService";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface Asset {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  createdAt: Date;
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetForm, setAssetForm] = useState({
    title: "",
    description: "",
    url: "",
    image: null as File | null,
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
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const handleAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imageUrl = "";
      if (assetForm.image) {
        const imageRef = ref(storage, `assets/${assetForm.image.name}`);
        const snapshot = await uploadBytes(imageRef, assetForm.image);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      if (editingAsset) {
        // Update existing asset
        const assetRef = doc(db, "assets", editingAsset.id);
        await updateDoc(assetRef, {
          title: assetForm.title,
          description: assetForm.description,
          url: assetForm.url,
          ...(imageUrl && { imageUrl }),
          updatedAt: new Date(),
        });

        setAssets(
          assets.map((asset) =>
            asset.id === editingAsset.id
              ? { ...asset, ...assetForm, imageUrl: imageUrl || asset.imageUrl }
              : asset
          )
        );
      } else {
        // Create new asset
        const docRef = await addDoc(collection(db, "assets"), {
          title: assetForm.title,
          description: assetForm.description,
          url: assetForm.url,
          imageUrl,
          createdAt: new Date(),
        });

        const newAsset = {
          id: docRef.id,
          title: assetForm.title,
          description: assetForm.description,
          url: assetForm.url,
          imageUrl,
          createdAt: new Date(),
        };

        setAssets([...assets, newAsset]);
      }

      setAssetForm({
        title: "",
        description: "",
        url: "",
        image: null,
      });
      setEditingAsset(null);
      alert(
        editingAsset
          ? "Asset updated successfully!"
          : "Asset created successfully!"
      );
    } catch (error) {
      console.error("Error creating asset:", error);
      alert("Error creating asset. Please try again.");
    }
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setAssetForm({
      title: asset.title,
      description: asset.description,
      url: asset.url,
      image: null,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAssetForm({ ...assetForm, image: e.target.files[0] });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="p-4">
        <div className="p-4 mt-14">
          <div className="bg-white dark:bg-gray-800 relative shadow-md sm:rounded-lg overflow-hidden mb-6">
            <div className="p-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {editingAsset ? "Edit Asset" : "Create New Asset"}
              </h2>
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
                    URL
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
                    Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    required
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
                >
                  {editingAsset ? "Update Asset" : "Create Asset"}
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 relative shadow-md sm:rounded-lg overflow-hidden mb-6">
            <div className="p-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Assets
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="relative group cursor-pointer"
                    onClick={() => handleEditAsset(asset)}
                  >
                    <div className="aspect-square overflow-hidden rounded-lg">
                      <img
                        src={asset.imageUrl}
                        alt={asset.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-75 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 text-white p-4 text-center">
                        <h3 className="text-lg font-semibold mb-3">
                          {asset.title}
                        </h3>
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Project
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
