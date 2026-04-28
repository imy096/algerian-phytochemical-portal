import { Outlet, Link, useLocation } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

export default function Layout() {
  const location = useLocation();
  const navRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/plants', label: 'Plants' },
    { path: '/compounds', label: 'Compounds' },
    { path: '/therapeutics', label: 'Therapeutics' },
    { path: '/targets', label: 'Targets' },
    { path: '/signatures', label: 'Signatures' },
    { path: '/publications', label: 'Publications' },
    { path: '/graph', label: 'Graph' },
    { path: '/data-access', label: 'Data Access' },
    { path: '/collaborate', label: 'Collaborate' },
    { path: '/admin-collaboration-review', label: 'Review Center' },
  ];

  const updateScrollButtons = () => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollButtons();
    const el = navRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, []);

  useEffect(() => {
    updateScrollButtons();
  }, [location.pathname]);

  const scrollNav = (dir: 'left' | 'right') => {
    const el = navRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === 'left' ? -260 : 260,
      behavior: 'smooth',
    });
  };

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-primary-900">
      <style>
        {`
          @keyframes logoFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }

          .logo-float {
            animation: logoFloat 5s ease-in-out infinite;
          }

          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }

          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>

      <header className="sticky top-0 z-50 border-b border-[#e7dccb] bg-[#fffdf8]/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-3 xl:flex-row xl:items-center xl:justify-between">
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <img
                src="/assets/logo_2-removebg-preview.png"
                alt="Portal logo"
                className="logo-float h-14 w-auto object-contain md:h-16"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />

              <div className="min-w-0">
                <div className="truncate text-2xl font-extrabold leading-tight text-[#4f4137] md:text-3xl">
                  Algeria Phyto-Chem
                </div>
                <div className="truncate text-sm font-semibold text-[#2b6f76] md:text-base">
                  Algerian Chemogenomic Portal
                </div>
              </div>
            </Link>

            <div className="w-full xl:max-w-3xl">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a38b6f]" />
                <input
                  type="text"
                  placeholder="Search plants, compounds, targets, diseases..."
                  className="w-full rounded-full border border-[#e4d4c0] bg-white px-12 py-3 text-sm text-primary-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>
          </div>

          <div className="relative border-t border-[#eadfce] py-2.5">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollNav('left')}
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[#e0d0bd] bg-white p-2 shadow-md transition hover:bg-sand-50"
              >
                <ChevronLeft className="h-4 w-4 text-[#6d5a48]" />
              </button>
            )}

            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollNav('right')}
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[#e0d0bd] bg-white p-2 shadow-md transition hover:bg-sand-50"
              >
                <ChevronRight className="h-4 w-4 text-[#6d5a48]" />
              </button>
            )}

            <div
              ref={navRef}
              className="hide-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto px-10 whitespace-nowrap"
            >
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={
                      isActive
                        ? 'rounded-full bg-teal-100 px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm'
                        : 'rounded-full px-4 py-2 text-sm font-medium text-[#6d5a48] transition hover:bg-sand-100 hover:text-[#3f342b]'
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-primary-100 bg-[#12383b] text-white">
        <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="flex items-center gap-4">
                <img
                  src="/assets/logo_2-removebg-preview.png"
                  alt="Portal logo"
                  className="h-14 w-auto object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div>
                  <p className="text-xl font-bold text-white">Algeria Phyto-Chem</p>
                  <p className="text-sm text-white/75">Chemogenomic research portal</p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-white/75">
                Curated Algerian medicinal plants, phytochemicals, biological evidence,
                and reusable research data for discovery-oriented research.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">Database</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/75">
                <li><Link to="/plants" className="hover:text-white">Plants</Link></li>
                <li><Link to="/compounds" className="hover:text-white">Compounds</Link></li>
                <li><Link to="/targets" className="hover:text-white">Targets</Link></li>
                <li><Link to="/signatures" className="hover:text-white">Signatures</Link></li>
                <li><Link to="/publications" className="hover:text-white">Publications</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">Research tools</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/75">
                <li><Link to="/graph" className="hover:text-white">Knowledge Graph</Link></li>
                <li><Link to="/data-access" className="hover:text-white">Data Access</Link></li>
                <li><Link to="/collaborate" className="hover:text-white">Collaborate</Link></li>
                <li><Link to="/admin-collaboration-review" className="hover:text-white">Review Center</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">Portal information</h3>
              <p className="mt-4 text-sm leading-7 text-white/75">
                Designed to support evidence-based natural product research and
                chemogenomic exploration.
              </p>

              <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-sm font-semibold text-white">Status</p>
                <p className="mt-1 text-sm text-white/75">Portal online and accessible</p>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/15 pt-6 text-sm text-white/65">
            © 2026 Algerian Chemogenomic Phytochemical Portal. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}