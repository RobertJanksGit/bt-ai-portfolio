import Navbar from "../components/Navbar";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="p-4 sm:ml-64">
        <div className="p-4 mt-14">
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-white dark:bg-gray-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to your Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                This is your personal dashboard where you can manage your
                content and settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
