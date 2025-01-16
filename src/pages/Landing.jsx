import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import Navbar from "../components/Navbar";

const Landing = () => {
  const { userData } = useAuth();
  const [assets, setAssets] = useState([]);

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
              <div
                key={asset.id}
                className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105"
              >
                <img
                  src={asset.imageUrl}
                  alt={asset.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {asset.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {asset.description}
                  </p>
                  {(userData?.role === "user" ||
                    userData?.role === "admin") && (
                    <a
                      href={asset.visitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Visit Project
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;
