import type { Route } from "./+types/home";
import useAuthStore from "~/stores/auth";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div>
      <h1>Hello world</h1>
      {isAuthenticated && user && (
        <div>
          <p>Welcome, {user.username}!</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
      {!isAuthenticated && (
        <p>Please log in to continue</p>
      )}
    </div>
  );
}
