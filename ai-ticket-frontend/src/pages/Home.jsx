import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Welcome to AI Ticket System</h1>
        <p className="mb-8 text-lg">A smart ticket management system powered by AI</p>
        
        <div className="flex gap-4 justify-center">
          <Link to="/login" className="btn btn-primary btn-lg">
            Login
          </Link>
          <Link to="/signup" className="btn btn-outline btn-lg">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
