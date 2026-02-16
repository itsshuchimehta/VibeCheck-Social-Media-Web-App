import { Bottombar, LeftSidebar, Loader, Topbar } from "@/components/shared";
import { useUserContext } from "@/context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

const RootLayout = () => {
  // 1. Get the loading state from your context
  const { isAuthenticated, isLoading } = useUserContext();

  // ✅ CRITICAL FIX:
  // If we are still checking the session, show a full-screen loader.
  // Do NOT run the <Navigate /> check yet.
  if (isLoading) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  // 2. Only redirect IF loading is finished AND user is missing
  if (!isAuthenticated) {
    return <Navigate to="/sign-in" />;
  }

  return (
    <div className="w-full md:flex">
      <Topbar />
      <LeftSidebar />

      <section className="flex flex-1 h-full">
        <Outlet />
      </section>

      <Bottombar />
    </div>
  );
};

export default RootLayout;
