import { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plants, compounds, diseases..."
          className="w-full pl-12 pr-4 py-3 bg-sage-50 border-2 border-sage-200 rounded-full text-sage-900 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-sage-400 focus:bg-white transition-all"
        />
      </div>
    </form>
  );
}
