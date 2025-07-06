'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ContentSource {
  id: string;
  type: 'youtube' | 'instagram' | 'twitter' | 'rss' | 'newsletter' | 'category';
  name: string;
  url?: string;
  username?: string;
  priority: 'high' | 'medium' | 'low';
  active: boolean;
  description?: string;
}

interface UserSession {
  email: string;
  verified: boolean;
  createdAt: string;
}

// Predefined categories/topics
const PREDEFINED_CATEGORIES = [
  { id: 'technology', name: 'Technology', description: 'Latest tech news, gadgets, and innovations' },
  { id: 'business', name: 'Business', description: 'Business news, entrepreneurship, and insights' },
  { id: 'science', name: 'Science', description: 'Scientific discoveries, research, and breakthroughs' },
  { id: 'health', name: 'Health & Wellness', description: 'Health tips, fitness, and medical news' },
  { id: 'education', name: 'Education', description: 'Learning resources and educational content' },
  { id: 'entertainment', name: 'Entertainment', description: 'Movies, TV shows, and pop culture' },
  { id: 'sports', name: 'Sports', description: 'Sports news, highlights, and athlete updates' },
  { id: 'politics', name: 'Politics', description: 'Political news, analysis, and world events' },
  { id: 'finance', name: 'Finance', description: 'Financial markets, investing, and money management' },
  { id: 'lifestyle', name: 'Lifestyle', description: 'Lifestyle tips, fashion, and personal development' },
  { id: 'travel', name: 'Travel', description: 'Travel guides, destinations, and adventure content' },
  { id: 'food', name: 'Food & Cooking', description: 'Recipes, restaurant reviews, and culinary content' },
  { id: 'gaming', name: 'Gaming', description: 'Video games, esports, and gaming news' },
  { id: 'art', name: 'Arts & Culture', description: 'Art, music, literature, and cultural content' },
  { id: 'environment', name: 'Environment', description: 'Climate change, sustainability, and green living' },
  { id: 'psychology', name: 'Psychology', description: 'Mental health, psychology, and self-improvement' },
  { id: 'history', name: 'History', description: 'Historical events, documentaries, and archives' },
  { id: 'philosophy', name: 'Philosophy', description: 'Philosophical discussions and thought-provoking content' },
  { id: 'diy', name: 'DIY & Crafts', description: 'Do-it-yourself projects, crafts, and tutorials' },
  { id: 'parenting', name: 'Parenting', description: 'Parenting tips, family content, and child development' },
];

const SOURCE_TYPES = [
  { 
    id: 'youtube' as const, 
    name: 'YouTube Channel', 
    icon: '📺', 
    inputType: 'username' as const,
    placeholder: 'Enter @username or channel URL',
    examples: ['@channelname', 'https://youtube.com/@username', 'UCxxxxxxxxxxxxxxxxxxxxx'],
    description: 'Add YouTube channels for video content',
    urlPattern: /^(https?:\/\/)?(www\.)?(youtube\.com\/(channel\/|c\/|user\/|@)|youtu\.be\/)/i,
    usernamePattern: /^@?[a-zA-Z0-9_.-]+$/
  },
  { 
    id: 'instagram' as const, 
    name: 'Instagram Account', 
    icon: '📸', 
    inputType: 'username' as const,
    placeholder: 'Enter username or profile URL',
    examples: ['username', 'https://instagram.com/username'],
    description: 'Add Instagram accounts for photo/video content',
    urlPattern: /^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9_.-]+/i,
    usernamePattern: /^@?[a-zA-Z0-9_.-]+$/
  },
  { 
    id: 'twitter' as const, 
    name: 'X/Twitter Account', 
    icon: '🐦', 
    inputType: 'username' as const,
    placeholder: 'Enter username or profile URL',
    examples: ['@username', 'https://twitter.com/username', 'https://x.com/username'],
    description: 'Add Twitter/X accounts for posts and threads',
    urlPattern: /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+/i,
    usernamePattern: /^@?[a-zA-Z0-9_]+$/
  },
  { 
    id: 'rss' as const, 
    name: 'RSS Feed', 
    icon: '📡', 
    inputType: 'url' as const,
    placeholder: 'Enter RSS feed URL',
    examples: ['https://example.com/feed.xml', 'https://blog.example.com/rss'],
    description: 'Add RSS feeds for blog posts and news',
    urlPattern: /^https?:\/\/.+/i,
    usernamePattern: null
  },
  { 
    id: 'newsletter' as const, 
    name: 'Newsletter', 
    icon: '📧', 
    inputType: 'url' as const,
    placeholder: 'Enter newsletter signup URL',
    examples: ['https://newsletter.example.com', 'https://example.substack.com'],
    description: 'Add newsletters for curated content',
    urlPattern: /^https?:\/\/.+/i,
    usernamePattern: null
  },
];

const PRIORITY_LEVELS = [
  { id: 'high' as const, name: 'High Priority', description: 'Show frequently', color: 'text-red-600 bg-red-50' },
  { id: 'medium' as const, name: 'Medium Priority', description: 'Show regularly', color: 'text-yellow-600 bg-yellow-50' },
  { id: 'low' as const, name: 'Low Priority', description: 'Show occasionally', color: 'text-green-600 bg-green-50' },
];

/**
 * Displays and manages the user's content sources and interests, allowing authenticated users to add, edit, remove, and organize content sources and predefined categories for a personalized feed.
 *
 * Provides UI for browsing and searching categories, adding new sources with input validation, editing existing sources, toggling source activation, and removing sources. Integrates with backend APIs for user authentication and persistent source management.
 *
 * Redirects to the login page if the user is not authenticated.
 *
 * @returns The content sources management page component.
 */
export default function ContentSourcesPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSource, setEditingSource] = useState<ContentSource | null>(null);
  const [formData, setFormData] = useState({
    type: 'youtube' as ContentSource['type'],
    name: '',
    url: '',
    username: '',
    priority: 'medium' as ContentSource['priority'],
    description: '',
  });
  const [, setFormError] = useState<string | null>(null);
  const [, setFormLoading] = useState(false);
  const [, setApiError] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const router = useRouter();

  // Utility functions for input validation and parsing
  const extractUsernameFromInput = (input: string, sourceType: ContentSource['type']): { username: string; url: string } => {
    const sourceConfig = SOURCE_TYPES.find(t => t.id === sourceType);
    if (!sourceConfig) return { username: '', url: input };

    const trimmedInput = input.trim();
    
    // If it's a URL, extract username from it
    if (sourceConfig.urlPattern && sourceConfig.urlPattern.test(trimmedInput)) {
      let extractedUsername = '';
      
      switch (sourceType) {
        case 'youtube':
          // Handle different YouTube URL formats
          const ytMatch = trimmedInput.match(/(?:youtube\.com\/(?:@|channel\/|c\/|user\/)|youtu\.be\/)([a-zA-Z0-9_.-]+)/i);
          extractedUsername = ytMatch ? ytMatch[1] : '';
          break;
        case 'instagram':
          const igMatch = trimmedInput.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/i);
          extractedUsername = igMatch ? igMatch[1] : '';
          break;
        case 'twitter':
          const twMatch = trimmedInput.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i);
          extractedUsername = twMatch ? twMatch[1] : '';
          break;
      }
      
      return {
        username: extractedUsername,
        url: trimmedInput
      };
    }
    
    // If it's a username, clean it and construct URL
    if (sourceConfig.usernamePattern && sourceConfig.usernamePattern.test(trimmedInput)) {
      const cleanUsername = trimmedInput.replace(/^@/, ''); // Remove @ prefix if present
      let constructedUrl = '';
      
      switch (sourceType) {
        case 'youtube':
          constructedUrl = `https://youtube.com/@${cleanUsername}`;
          break;
        case 'instagram':
          constructedUrl = `https://instagram.com/${cleanUsername}`;
          break;
        case 'twitter':
          constructedUrl = `https://x.com/${cleanUsername}`;
          break;
      }
      
      return {
        username: cleanUsername,
        url: constructedUrl
      };
    }

    // For URL-only sources (RSS, newsletter), return as-is
    if (sourceConfig.inputType === 'url') {
      return {
        username: '',
        url: trimmedInput
      };
    }
    
    return { username: '', url: trimmedInput };
  };

  const validateInput = (input: string, sourceType: ContentSource['type']): string | null => {
    if (!input.trim()) {
      return 'This field is required';
    }

    const sourceConfig = SOURCE_TYPES.find(t => t.id === sourceType);
    if (!sourceConfig) return 'Invalid source type';

    const trimmedInput = input.trim();

    // For URL-only sources, validate URL format
    if (sourceConfig.inputType === 'url') {
      if (!sourceConfig.urlPattern?.test(trimmedInput)) {
        return 'Please enter a valid URL starting with http:// or https://';
      }
      return null;
    }

    // For username sources, check if it's either a valid URL or username
    const isValidUrl = sourceConfig.urlPattern?.test(trimmedInput);
    const isValidUsername = sourceConfig.usernamePattern?.test(trimmedInput);

    if (!isValidUrl && !isValidUsername) {
      return `Please enter a valid ${sourceType} username or URL`;
    }

    return null;
  };

  // Handle input change with real-time validation
  const handleInputChange = (value: string) => {
    setFormData({ ...formData, url: value });
    setInputError(null);
    
    // Show validation error only if input is not empty
    if (value.trim()) {
      const error = validateInput(value, formData.type);
      setInputError(error);
    }
  };

  // Handle source type change
  const handleSourceTypeChange = (newType: ContentSource['type']) => {
    setFormData({ 
      ...formData, 
      type: newType,
      url: '', // Clear URL when changing type
      username: '' // Clear username when changing type
    });
    setInputError(null);
  };

  // Fetch user and content sources from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setApiError(null);
      try {
        // Fetch user info
        const userRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (!userRes.ok) {
          router.push('/auth/login');
          return;
        }
        const userData = await userRes.json();
        setUser(userData.user);
        // Fetch content sources
        const sourcesRes = await fetch('/api/content-sources', { credentials: 'include' });
        if (!sourcesRes.ok) {
          setApiError('Failed to load content sources.');
          setSources([]);
        } else {
          const sourcesData = await sourcesRes.json();
          setSources(sourcesData);
        }
      } catch {
        setApiError('Network error loading content sources.');
        setSources([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/auth/login');
    }
  };

  const handleAddSource = () => {
    setShowAddForm(true);
    setEditingSource(null);
    setFormData({
      type: 'youtube',
      name: '',
      url: '',
      username: '',
      priority: 'medium',
      description: '',
    });
    setFormError(null);
    setInputError(null);
  };

  const handleEditSource = (source: ContentSource) => {
    setEditingSource(source);
    setShowAddForm(true);
    setFormData({
      type: source.type,
      name: source.name,
      url: source.url || '',
      username: source.username || '',
      priority: source.priority,
      description: source.description || '',
    });
    setFormError(null);
    setInputError(null);
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to remove this content source?')) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/content-sources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sourceId }),
        credentials: 'include',
      });
      if (!res.ok) {
        setApiError('Failed to delete content source.');
      } else {
        setSources(sources.filter(s => s.id !== sourceId));
      }
    } catch {
      setApiError('Network error deleting content source.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/content-sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...source, active: !source.active }),
        credentials: 'include',
      });
      if (!res.ok) {
        setApiError('Failed to update content source.');
      } else {
        const updated = await res.json();
        setSources(sources.map(s => s.id === sourceId ? updated : s));
      }
    } catch {
      setApiError('Network error updating content source.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setInputError(null);
    setFormLoading(true);
    
    // Basic validation
    if (!formData.name.trim()) {
      setFormError('Name is required.');
      setFormLoading(false);
      return;
    }
    if (!formData.type) {
      setFormError('Source type is required.');
      setFormLoading(false);
      return;
    }

    // Validate and process the URL/username input
    const inputValue = formData.url; // This field contains either URL or username
    const validationError = validateInput(inputValue, formData.type);
    if (validationError) {
      setFormError(validationError);
      setFormLoading(false);
      return;
    }

    // Extract username and URL based on input
    const { username, url } = extractUsernameFromInput(inputValue, formData.type);
    
    // Prepare the final form data with processed username and URL
    const processedFormData = {
      ...formData,
      url,
      username,
    };

    try {
      let res;
      if (editingSource) {
        res = await fetch('/api/content-sources', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...editingSource, ...processedFormData }),
          credentials: 'include',
        });
      } else {
        res = await fetch('/api/content-sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(processedFormData),
          credentials: 'include',
        });
      }
      if (!res.ok) {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to save content source.');
      } else {
        const saved = await res.json();
        if (editingSource) {
          setSources(sources.map(s => s.id === saved.id ? saved : s));
        } else {
          setSources([...sources, saved]);
        }
        setShowAddForm(false);
        setEditingSource(null);
      }
    } catch {
      setFormError('Network error saving content source.');
    } finally {
      setFormLoading(false);
    }
  };

  // Filter categories based on search
  const filteredCategories = PREDEFINED_CATEGORIES.filter(category =>
    category.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
    category.description.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Show only first 8 categories by default, unless showing all
  const categoriesToShow = showAllCategories ? filteredCategories : filteredCategories.slice(0, 8);

  const handleAddCategory = async (categoryId: string) => {
    const category = PREDEFINED_CATEGORIES.find(c => c.id === categoryId);
    if (!category || sources.some(s => s.type === 'category' && s.name === category.name)) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/content-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'category',
          name: category.name,
          priority: 'medium',
          active: true,
          description: category.description,
        }),
        credentials: 'include',
      });
      if (!res.ok) {
        setApiError('Failed to add category.');
      } else {
        const saved = await res.json();
        setSources([...sources, saved]);
      }
    } catch {
      setApiError('Network error adding category.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getSourceIcon = (type: ContentSource['type']) => {
    const sourceType = SOURCE_TYPES.find(st => st.id === type);
    return sourceType?.icon || '📂';
  };

  const getPriorityColor = (priority: ContentSource['priority']) => {
    const priorityLevel = PRIORITY_LEVELS.find(p => p.id === priority);
    return priorityLevel?.color || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-semibold text-gray-900">
                ZenFeed
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                Settings
              </Link>
              <span className="text-sm text-gray-700">Welcome, {user.email}</span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Content Sources</h1>
            <p className="mt-2 text-gray-600">
              Manage your content sources and interests to create a personalized feed
            </p>
          </div>

          {/* Quick Add Categories */}
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-mono font-bold text-gray-900">
                Browse Categories
              </h2>
              <span className="text-sm text-gray-500 font-mono">
                {filteredCategories.length} categories
              </span>
            </div>
            
            {/* Search Input */}
            <div className="mb-6">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search categories (e.g., tech, health, finance...)"
                  value={categorySearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategorySearch(e.target.value)}
                  className="w-full pl-10"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔍
                </div>
                {categorySearch && (
                  <button
                    onClick={() => setCategorySearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              {categorySearch && (
                <div className="mt-2 text-sm text-gray-500 font-mono">
                  {filteredCategories.length} result{filteredCategories.length === 1 ? '' : 's'} for &quot;{categorySearch}&quot;
                </div>
              )}
            </div>

            {/* Categories Grid */}
            {filteredCategories.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoriesToShow.map((category) => {
                    const isAdded = sources.some(s => s.type === 'category' && s.name === category.name);
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleAddCategory(category.id)}
                        disabled={isAdded}
                        className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                          isAdded
                            ? 'border-green-200 bg-green-50 text-green-700 cursor-not-allowed'
                            : 'border-gray-200 bg-white hover:border-[#2563eb] hover:bg-blue-50 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-mono font-semibold text-sm mb-1">
                              {category.name}
                            </div>
                            <div className="text-xs text-gray-600 leading-relaxed">
                              {category.description}
                            </div>
                          </div>
                          {isAdded ? (
                            <div className="ml-2 mt-1">
                              <span className="text-green-600 text-sm">✓</span>
                            </div>
                          ) : (
                            <div className="ml-2 mt-1">
                              <span className="text-gray-400 text-sm">+</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Show More/Less Button */}
                {filteredCategories.length > 8 && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setShowAllCategories(!showAllCategories)}
                      className="px-6 py-2 text-sm font-mono text-[#0e7490] hover:text-[#2563eb] transition-colors"
                    >
                      {showAllCategories 
                        ? `Show Less (${categoriesToShow.length - 8} hidden)` 
                        : `Show All ${filteredCategories.length} Categories`
                      }
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">🔍</div>
                <p className="text-gray-500 font-mono">
                  No categories found for &quot;{categorySearch}&quot;
                </p>
                <button
                  onClick={() => setCategorySearch('')}
                  className="mt-2 text-sm text-[#0e7490] hover:text-[#2563eb] font-mono"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>

          {/* Add New Source Button */}
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Content Sources ({sources.length})
            </h2>
            <Button onClick={handleAddSource} className="bg-indigo-600 hover:bg-indigo-700">
              Add New Source
            </Button>
          </div>

          {/* Content Sources List */}
          <div className="space-y-4">
            {sources.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No content sources yet</h3>
                <p className="text-gray-600 mb-4">
                  Add your first content source to start building your personalized feed
                </p>
                <Button onClick={handleAddSource} className="bg-indigo-600 hover:bg-indigo-700">
                  Add Your First Source
                </Button>
              </div>
            ) : (
              sources.map((source) => (
                <div key={source.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">{getSourceIcon(source.type)}</div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{source.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">{source.type}</p>
                        {source.url && (
                          <p className="text-xs text-gray-500 mt-1">{source.url}</p>
                        )}
                        {source.description && (
                          <p className="text-sm text-gray-700 mt-2">{source.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityColor(source.priority)}`}>
                        {source.priority} priority
                      </span>
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={source.active}
                          onChange={() => handleToggleActive(source.id)}
                          className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                        />
                        <span className="ml-2 text-sm text-gray-700">Active</span>
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSource(source)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSource(source.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Source Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingSource ? 'Edit Content Source' : 'Add New Content Source'}
            </h3>
            
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleSourceTypeChange(e.target.value as ContentSource['type'])}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {SOURCE_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {SOURCE_TYPES.find(t => t.id === formData.type)?.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter a name for this source"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {(() => {
                    const sourceType = SOURCE_TYPES.find(t => t.id === formData.type);
                    if (sourceType?.inputType === 'url') {
                      return sourceType.id === 'rss' ? 'RSS Feed URL' : 'URL';
                    }
                    return 'Username or URL';
                  })()}
                </label>
                <Input
                  type="text"
                  value={formData.url}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={SOURCE_TYPES.find(t => t.id === formData.type)?.placeholder}
                  className={inputError ? 'border-red-500 focus:ring-red-500' : ''}
                />
                {inputError && (
                  <p className="mt-1 text-sm text-red-600">{inputError}</p>
                )}
                
                {/* Show examples for current source type */}
                {(() => {
                  const sourceType = SOURCE_TYPES.find(t => t.id === formData.type);
                  if (sourceType?.examples) {
                    return (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Examples:</p>
                        <div className="space-y-1">
                          {sourceType.examples.map((example, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setFormData({ ...formData, url: example })}
                              className="block text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              {example}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as ContentSource['priority'] })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PRIORITY_LEVELS.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name} - {level.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add a description for this source"
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setInputError(null);
                    setFormError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  {editingSource ? 'Update Source' : 'Add Source'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 