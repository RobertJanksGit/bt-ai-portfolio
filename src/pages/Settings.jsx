import { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";

const Settings = () => {
  const { userData, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please upload an image file" });
      return;
    }

    try {
      setLoading(true);
      await updateProfile({ photoURL: file });
      setMessage({
        type: "success",
        text: "Profile photo updated successfully!",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessage({ type: "error", text: "Failed to update profile photo" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newName = nameInputRef.current.value;

    if (newName === userData?.name) {
      return;
    }

    try {
      setLoading(true);
      await updateProfile({ name: newName });
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: "error", text: "Failed to update profile" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="p-4">
        <div className="p-4 mt-14">
          <div className="max-w-xl mx-auto bg-white rounded-lg shadow-md dark:bg-gray-800 p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Profile Settings
            </h2>

            {message.text && (
              <div
                className={`p-4 mb-6 text-sm rounded-lg ${
                  message.type === "success"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Profile Photo Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Profile Photo
              </label>
              <div
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 hover:bg-gray-100 transition-colors duration-150 ease-in-out ${
                  isDragging
                    ? "border-blue-500 bg-blue-50 dark:bg-gray-700"
                    : ""
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {userData?.photoURL ? (
                  <img
                    src={userData.photoURL}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover mb-4 ring-4 ring-gray-100 dark:ring-gray-700"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-10 h-10 mb-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      ></path>
                    </svg>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PNG, JPG or GIF
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                />
              </div>
            </div>

            {/* Profile Information Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-900 dark:text-white mb-2"
                >
                  Display Name
                </label>
                <input
                  type="text"
                  id="name"
                  ref={nameInputRef}
                  defaultValue={userData?.name}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Email
                </label>
                <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">
                  {userData?.email}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Account Type
                </label>
                <div className="flex flex-col space-y-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full w-fit ${
                      userData?.role === "admin"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                    }`}
                  >
                    {userData?.role?.toUpperCase()}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {userData?.role === "admin"
                      ? "You have administrative privileges and can access all features."
                      : "You have standard user privileges."}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50 transition-colors duration-150 ease-in-out"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
