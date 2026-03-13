import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-800/60 py-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/"
          className="text-sm font-black"
          style={{ fontFamily: "var(--font-noto-sans-jp)" }}
        >
          <span className="text-red-500">漫</span>enpitsu
        </Link>
        <div
          className="text-[11px] text-gray-600 tracking-wide"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          Powered by Google Gemini
        </div>
        <div className="text-[11px] text-gray-700">
          &copy; {new Date().getFullYear()} enpitsu
        </div>
      </div>
    </footer>
  );
}
