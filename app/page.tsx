import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-white">
      <main className="flex flex-col items-center justify-center flex-1 px-4 py-12">
        <img src="/logo.png" alt="ZenFeed Logo" className="w-32 h-32 mb-6" />
        <h1 className="text-5xl sm:text-6xl font-mono font-extrabold text-center mb-4 text-gray-900 tracking-tight">
          Mindful Media, <br className="sm:hidden" />
          Focused Life
        </h1>
        <p className="text-lg text-gray-600 text-center mb-8 max-w-xl">
          Welcome to <span className="font-semibold text-[#0e7490]">ZenFeed</span> — your digital wellness dashboard. Curate your feeds, set healthy limits, and enjoy distraction-free content. Reclaim your attention, one session at a time.
        </p>
        <Link href="/auth/login">
          <button className="mt-2 mb-10 px-8 py-3 bg-gray-900 hover:bg-[#2563eb] text-white font-mono font-semibold text-lg rounded shadow transition-colors">
            Login to ZenFeed
          </button>
        </Link>
        <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-8 mt-2">
          <div className="flex flex-col items-center text-center">
            <span className="text-2xl mb-2">🧘‍♂️</span>
            <span className="font-mono font-bold text-gray-900 mb-1">Digital Wellness</span>
            <span className="text-gray-600 text-sm">Build mindful habits and reduce digital overload with curated, time-boxed sessions.</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-2xl mb-2">📚</span>
            <span className="font-mono font-bold text-gray-900 mb-1">Curated Content</span>
            <span className="text-gray-600 text-sm">Personalize your dashboard with your favorite sources, topics, and newsletters.</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-2xl mb-2">⏰</span>
            <span className="font-mono font-bold text-gray-900 mb-1">Time Management</span>
            <span className="text-gray-600 text-sm">Set healthy limits, track your progress, and enjoy focused, distraction-free sessions.</span>
          </div>
        </div>
      </main>
      <footer className="flex justify-between items-center w-full px-6 py-4 text-xs text-gray-400 border-t border-gray-100">
        <span>&copy; {new Date().getFullYear()} ZenFeed Inc.</span>
        <a href="#" className="hover:underline">Feedback &amp; Support</a>
      </footer>
    </div>
  );
}
