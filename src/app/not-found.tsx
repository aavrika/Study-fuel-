export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-stone-900 mb-2">404</h1>
        <p className="text-stone-600 mb-4">Page not found</p>
        <a
          href="/"
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
