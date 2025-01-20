import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import Navbar from "../components/Navbar";

const ProjectCard = ({ asset, userData, onCommentClick, selectedUser }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
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

  // Check for unread messages using only Firestore real-time updates
  useEffect(() => {
    if (!userData) return;

    const commentsRef = collection(db, "comments");
    let q;

    if (userData.role === "admin") {
      // For admin, check if there are any unread messages from users
      // Only filter by user if one is selected
      const baseQuery = [
        where("assetId", "==", asset.id),
        where("userRole", "==", "user"),
        where("isRead", "==", false),
      ];

      if (selectedUser) {
        q = query(
          commentsRef,
          ...baseQuery,
          where("userId", "!=", selectedUser.uid)
        );
      } else {
        q = query(commentsRef, ...baseQuery);
      }
    } else {
      // For users, check if there are any unread messages from admin
      q = query(
        commentsRef,
        where("assetId", "==", asset.id),
        where("userRole", "==", "admin"),
        where("isRead", "==", false),
        where("recipientId", "==", userData.uid)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasUnreadMessages(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [asset.id, userData, selectedUser]);

  const handleCommentClick = () => {
    onCommentClick(asset);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105">
      <div className="relative">
        <img
          src={imageUrls[currentImageIndex]}
          alt={asset.title}
          className="w-full h-72 object-cover transition-all duration-500"
        />
        {asset.isWorkInProgress && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-md text-xs font-medium">
            Work in Progress
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 truncate">
          {asset.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap">
          {asset.description}
        </p>
        {asset.techStack && asset.techStack.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {asset.techStack.map((tech, index) => (
                <span
                  key={index}
                  className="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-md text-xs"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {!asset.isWorkInProgress && asset.url && (
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors duration-200"
              >
                Live Demo
              </a>
            )}
            {asset.githubUrl && (
              <a
                href={asset.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm transition-colors duration-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                GitHub
              </a>
            )}
          </div>
          {userData && (
            <div
              className={`relative ${!asset.isWorkInProgress ? "" : "ml-auto"}`}
            >
              <button
                onClick={handleCommentClick}
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
              {hasUnreadMessages && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ProjectCard.propTypes = {
  asset: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    url: PropTypes.string,
    githubUrl: PropTypes.string,
    imageUrls: PropTypes.arrayOf(PropTypes.string),
    imageUrl: PropTypes.string,
    isWorkInProgress: PropTypes.bool,
    techStack: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  userData: PropTypes.shape({
    role: PropTypes.string.isRequired,
    uid: PropTypes.string.isRequired,
  }),
  onCommentClick: PropTypes.func.isRequired,
  selectedUser: PropTypes.shape({
    uid: PropTypes.string.isRequired,
  }),
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
  const [usersWithUnread, setUsersWithUnread] = useState(new Set());

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

  useEffect(() => {
    if (userData?.role !== "admin") return;

    const checkUnreadMessages = async () => {
      try {
        const commentsRef = collection(db, "comments");
        const q = query(
          commentsRef,
          where("userRole", "==", "user"),
          where("isRead", "==", false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const unreadUsers = new Set();
          snapshot.docs.forEach((doc) => {
            const comment = doc.data();
            unreadUsers.add(comment.userId);
          });
          setUsersWithUnread(unreadUsers);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error checking unread messages:", error);
      }
    };

    checkUnreadMessages();
  }, [userData?.role]);

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
      const usersRef = collection(db, "users");

      if (userData?.role === "admin" && selectedUser) {
        // Admin viewing specific user's conversation
        const q = query(
          commentsRef,
          where("assetId", "==", assetId),
          where("userId", "in", [selectedUser.uid, "admin"]),
          where("recipientId", "in", [selectedUser.uid, "admin"]),
          orderBy("createdAt", "asc")
        );

        const commentSnapshot = await getDocs(q);
        const commentList = await Promise.all(
          commentSnapshot.docs.map(async (doc) => {
            const commentData = doc.data();
            // Get user profile data
            if (commentData.userId !== "admin") {
              const userDoc = await getDocs(
                query(usersRef, where("uid", "==", commentData.userId))
              );
              if (!userDoc.empty) {
                const userData = userDoc.docs[0].data();
                commentData.userPhotoURL = userData.photoURL;
              }
            } else {
              // For admin messages, use the current admin's photo
              commentData.userPhotoURL = userData.photoURL;
            }
            return {
              id: doc.id,
              ...commentData,
              createdAt: commentData.createdAt?.toDate(),
            };
          })
        );

        setComments(commentList);
      } else if (userData?.role === "user") {
        // Regular user viewing their conversation
        const q = query(
          commentsRef,
          where("assetId", "==", assetId),
          where("recipientId", "in", [userData.uid, "admin"]),
          where("userId", "in", [userData.uid, "admin"]),
          orderBy("createdAt", "asc")
        );

        const commentSnapshot = await getDocs(q);
        const commentList = await Promise.all(
          commentSnapshot.docs.map(async (doc) => {
            const commentData = doc.data();
            // For admin messages, get admin profile
            if (commentData.userId === "admin") {
              const adminDoc = await getDocs(
                query(usersRef, where("role", "==", "admin"))
              );
              if (!adminDoc.empty) {
                const adminData = adminDoc.docs[0].data();
                commentData.userPhotoURL = adminData.photoURL;
              }
            } else {
              // For user's own messages
              commentData.userPhotoURL = userData.photoURL;
            }
            return {
              id: doc.id,
              ...commentData,
              createdAt: commentData.createdAt?.toDate(),
            };
          })
        );

        setComments(commentList);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleCommentClick = async (asset) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);

    if (userData?.role === "admin") {
      // For admin, wait for user selection before fetching comments
      if (selectedUser) {
        await fetchComments(asset.id);
      }
    } else {
      // For regular users, mark all admin messages for this asset as read
      const commentsRef = collection(db, "comments");
      const q = query(
        commentsRef,
        where("assetId", "==", asset.id),
        where("userRole", "==", "admin"),
        where("recipientId", "==", userData.uid),
        where("isRead", "==", false)
      );
      const batch = writeBatch(db);
      const unreadSnapshot = await getDocs(q);
      unreadSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isRead: true });
      });
      await batch.commit();
      await fetchComments(asset.id);
    }
  };

  // Add effect to fetch comments when selectedUser changes for admin
  useEffect(() => {
    if (userData?.role === "admin" && selectedUser && selectedAsset) {
      const markMessagesAsRead = async () => {
        // Mark all unread messages from this user as read
        const commentsRef = collection(db, "comments");
        const q = query(
          commentsRef,
          where("assetId", "==", selectedAsset.id),
          where("userId", "==", selectedUser.uid),
          where("isRead", "==", false)
        );
        const batch = writeBatch(db);
        const unreadSnapshot = await getDocs(q);
        unreadSnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();
      };

      fetchComments(selectedAsset.id);
      markMessagesAsRead();
    }
  }, [selectedUser, selectedAsset]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const commentData = {
        assetId: selectedAsset.id,
        userId: userData.role === "admin" ? "admin" : userData.uid,
        userName: userData.name || userData.email,
        userRole: userData.role,
        content: newComment,
        createdAt: serverTimestamp(),
        isRead: false,
        recipientId: userData.role === "admin" ? selectedUser.uid : "admin",
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
                selectedUser={selectedUser}
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
                          // Mark all unread messages from this user as read for all assets
                          const markMessagesAsRead = async () => {
                            const commentsRef = collection(db, "comments");
                            const q = query(
                              commentsRef,
                              where("userId", "==", user.uid),
                              where("isRead", "==", false)
                            );
                            const batch = writeBatch(db);
                            const unreadSnapshot = await getDocs(q);
                            unreadSnapshot.docs.forEach((doc) => {
                              batch.update(doc.ref, { isRead: true });
                            });
                            await batch.commit();
                          };
                          markMessagesAsRead();
                          fetchComments(selectedAsset.id);
                        }
                      }}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">
                        Select a user to view conversation
                      </option>
                      {users.map((user) => (
                        <option
                          key={user.uid}
                          value={user.uid}
                          className="flex items-center justify-between"
                        >
                          {user.name || user.email}
                          {usersWithUnread.has(user.uid) && " 🔴"}
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
                  {comments.map((comment) => {
                    // Determine if this message should be on the right
                    const isOwnMessage =
                      (userData.role === "admin" &&
                        comment.userId === "admin") ||
                      (userData.role === "user" &&
                        comment.userId === userData.uid);

                    return (
                      <div
                        key={comment.id}
                        className={`p-4 rounded-lg w-2/3 ${
                          isOwnMessage
                            ? "bg-blue-50 dark:bg-blue-900/30 ml-auto"
                            : "bg-gray-50 dark:bg-gray-700/50"
                        }`}
                      >
                        <div
                          className={`flex justify-between items-start mb-2 ${
                            isOwnMessage ? "flex-row-reverse" : ""
                          }`}
                        >
                          <div
                            className={`flex items-center gap-2 ${
                              isOwnMessage ? "flex-row-reverse" : ""
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              {comment.userPhotoURL ? (
                                <img
                                  src={comment.userPhotoURL}
                                  alt={comment.userName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                  {comment.userName?.charAt(0)?.toUpperCase() ||
                                    "U"}
                                </span>
                              )}
                            </div>
                            <div
                              className={`flex items-center gap-2 ${
                                isOwnMessage ? "flex-row-reverse" : ""
                              }`}
                            >
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {comment.userName}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  comment.userRole === "admin"
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                                }`}
                              >
                                {comment.userRole}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {comment.createdAt?.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-center">
                          <p className="text-gray-700 dark:text-gray-300">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
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
