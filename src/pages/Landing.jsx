import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import Navbar from "../components/Navbar";

const ProjectCard = ({ asset, userData, onCommentClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageUrls = asset.imageUrls || [asset.imageUrl]; // Fallback for old assets

  useEffect(() => {
    if (!imageUrls?.length) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === imageUrls.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [imageUrls]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105">
      <div className="relative">
        <img
          src={imageUrls[currentImageIndex]}
          alt={asset.title}
          className="w-full h-48 object-cover transition-all duration-500"
        />
      </div>
      <div className="p-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {asset.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {asset.description}
        </p>
        <div className="flex justify-between items-center">
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View Project
          </a>
          {userData && (
            <button
              onClick={() => onCommentClick(asset)}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Landing = () => {
  const { userData } = useAuth();
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const commentsEndRef = useRef(null);

  // Fetch users for admin
  useEffect(() => {
    const fetchUsers = async () => {
      if (userData?.role === "admin") {
        try {
          const usersRef = collection(db, "users");
          const userSnapshot = await getDocs(usersRef);
          const userList = userSnapshot.docs
            .map((doc) => ({
              uid: doc.id,
              ...doc.data(),
            }))
            .filter((user) => user.role === "user"); // Only get regular users
          setUsers(userList);
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      }
    };
    fetchUsers();
  }, [userData]);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isModalOpen) {
      scrollToBottom();
    }
  }, [comments, isModalOpen]);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const assetsCollection = collection(db, "assets");
        const assetSnapshot = await getDocs(assetsCollection);
        const assetList = assetSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAssets(assetList);
      } catch (error) {
        console.error("Error fetching assets:", error);
      }
    };

    fetchAssets();
  }, []);

  const scrollToProjects = () => {
    document.getElementById("projects").scrollIntoView({ behavior: "smooth" });
  };

  const fetchComments = async (assetId) => {
    try {
      const commentsRef = collection(db, "comments");
      let q;

      if (userData?.role === "admin" && selectedUser) {
        // Admin viewing specific user's conversation
        q = query(
          commentsRef,
          where("assetId", "==", assetId),
          where("userId", "in", [selectedUser.uid, userData.uid]),
          orderBy("createdAt", "asc")
        );
        const commentSnapshot = await getDocs(q);
        const commentList = commentSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        }));
        setComments(commentList);
      } else if (userData?.role === "user") {
        // Regular user viewing their conversation with admin
        q = query(
          commentsRef,
          where("assetId", "==", assetId),
          orderBy("createdAt", "asc")
        );

        const commentSnapshot = await getDocs(q);
        const commentList = commentSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
          }))
          .filter(
            (comment) =>
              comment.userId === userData.uid || comment.userRole === "admin"
          );

        setComments(commentList);
      } else {
        // Default query if something goes wrong
        q = query(
          commentsRef,
          where("assetId", "==", assetId),
          orderBy("createdAt", "asc")
        );
        const commentSnapshot = await getDocs(q);
        const commentList = commentSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        }));
        setComments(commentList);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleCommentClick = async (asset) => {
    setSelectedAsset(asset);
    await fetchComments(asset.id);
    setIsModalOpen(true);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const commentData = {
        assetId: selectedAsset.id,
        userId: userData.uid,
        userName: userData.name || userData.email,
        userRole: userData.role,
        content: newComment,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "comments"), commentData);
      setNewComment("");
      await fetchComments(selectedAsset.id);
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="pt-20">
        {/* Hero Section */}
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-8">
            Welcome to My Portfolio
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            Discover my journey, projects, and skills as a developer. Let&apos;s
            create something amazing together.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={scrollToProjects}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Projects
            </button>
            <button className="px-6 py-3 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors">
              Contact Me
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div id="projects" className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {assets.map((asset) => (
              <ProjectCard
                key={asset.id}
                asset={asset}
                userData={userData}
                onCommentClick={handleCommentClick}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Comments Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Comments for {selectedAsset?.title}
                </h2>
                {userData?.role === "admin" && (
                  <div className="mt-2">
                    <select
                      value={selectedUser?.uid || ""}
                      onChange={(e) => {
                        const user = users.find(
                          (u) => u.uid === e.target.value
                        );
                        setSelectedUser(user);
                        if (user) {
                          fetchComments(selectedAsset.id);
                        }
                      }}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">
                        Select a user to view conversation
                      </option>
                      {users.map((user) => (
                        <option key={user.uid} value={user.uid}>
                          {user.name || user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  if (userData?.role === "admin") {
                    setSelectedUser(null);
                  }
                }}
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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {userData?.role === "admin" && !selectedUser ? (
                <div className="text-center text-gray-600 dark:text-gray-400">
                  Please select a user to view their conversation
                </div>
              ) : (
                <div className="space-y-4 mb-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-lg ${
                        comment.userId === userData.uid
                          ? "bg-blue-50 dark:bg-blue-900/30 ml-8"
                          : "bg-gray-50 dark:bg-gray-700/50 mr-8"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {comment.userName}
                          </span>
                          <span
                            className={`ml-2 text-xs px-2 py-1 rounded ${
                              comment.userRole === "admin"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                            }`}
                          >
                            {comment.userRole}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {comment.createdAt?.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>
              )}
            </div>

            {/* Fixed Footer with Comment Form */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6">
              {(userData?.role !== "admin" || selectedUser) && (
                <form onSubmit={handleSubmitComment}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (newComment.trim()) {
                          handleSubmitComment(e);
                        }
                      }
                    }}
                    placeholder="Write your comment... (Press Enter to send, Shift + Enter for new line)"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows="3"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      disabled={!newComment.trim()}
                    >
                      Send Comment
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
