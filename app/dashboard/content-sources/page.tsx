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
  { id: 'technology', name: 'Technology', description: 'Latest tech news and innovations' },
  { id: 'business', name: 'Business', description: 'Business news and insights' },
  { id: 'science', name: 'Science', description: 'Scientific discoveries and research' },
  { id: 'health', name: 'Health & Wellness', description: 'Health tips and medical news' },
  { id: 'education', name: 'Education', description: 'Learning resources and educational content' },
  { id: 'entertainment', name: 'Entertainment', description: 'Movies, TV shows, and pop culture' },
  { id: 'sports', name: 'Sports', description: 'Sports news and highlights' },
  { id: 'politics', name: 'Politics', description: 'Political news and analysis' },
  { id: 'finance', name: 'Finance', description: 'Financial markets and investment news' },
  { id: 'lifestyle', name: 'Lifestyle', description: 'Lifestyle tips and trends' },
  { id: 'travel', name: 'Travel', description: 'Travel guides and destination content' },
  { id: 'food', name: 'Food & Cooking', description: 'Recipes and culinary content' },
];

const SOURCE_TYPES = [
  { 
    id: 'youtube' as const, 
    name: 'YouTube Channel', 
    icon: '📺', 
    placeholder: 'Enter channel URL or @username',
    description: 'Add YouTube channels for video content'
  },
  { 
    id: 'instagram' as const, 
    name: 'Instagram Account', 
    icon: '📸', 
    placeholder: 'Enter Instagram username',
    description: 'Add Instagram accounts for photo/video content'
  },
  { 
    id: 'twitter' as const, 
    name: 'X/Twitter Account', 
    icon: '🐦', 
    placeholder: 'Enter Twitter/X username',
    description: 'Add Twitter/X accounts for posts and threads'
  },
  { 
    id: 'rss' as const, 
    name: 'RSS Feed', 
    icon: '📡', 
    placeholder: 'Enter RSS feed URL',
    description: 'Add RSS feeds for blog posts and news'
  },
  { 
    id: 'newsletter' as const, 
    name: 'Newsletter', 
    icon: '📧', 
    placeholder: 'Enter newsletter URL or name',
    description: 'Add newsletters for curated content'
  },
];

const PRIORITY_LEVELS = [
  { id: 'high' as const, name: 'High Priority', description: 'Show frequently', color: 'text-red-600 bg-red-50' },
  { id: 'medium' as const, name: 'Medium Priority', description: 'Show regularly', color: 'text-yellow-600 bg-yellow-50' },
  { id: 'low' as const, name: 'Low Priority', description: 'Show occasionally', color: 'text-green-600 bg-green-50' },
];

export default function ContentSourcesPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSource, setEditingSource] = useState<ContentSource | null>(null);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    type: 'youtube' as ContentSource['type'],
    name: '',
    url: '',
    username: '',
    priority: 'medium' as ContentSource['priority'],
    description: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (!response.ok) {
          router.push('/auth/login');
          return;
        }
        
        const data = await response.json();
        setUser(data.user);
        
        // Load existing content sources (mock data for now)
        setSources([
          {
            id: '1',
            type: 'youtube',
            name: 'TechCrunch',
            url: 'https://youtube.com/@TechCrunch',
            priority: 'high',
            active: true,
            description: 'Latest tech news and startup coverage',
          },
          {
            id: '2',
            type: 'category',
            name: 'Science',
            priority: 'medium',
            active: true,
            description: 'Scientific discoveries and research',
          },
        ]);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
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
  };

  const handleDeleteSource = (sourceId: string) => {
    if (confirm('Are you sure you want to remove this content source?')) {
      setSources(sources.filter(s => s.id !== sourceId));
    }
  };

  const handleToggleActive = (sourceId: string) => {
    setSources(sources.map(s => 
      s.id === sourceId ? { ...s, active: !s.active } : s
    ));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSource) {
      // Update existing source
      setSources(sources.map(s => 
        s.id === editingSource.id 
          ? { ...s, ...formData }
          : s
      ));
    } else {
      // Add new source
      const newSource: ContentSource = {
        id: Date.now().toString(),
        ...formData,
        active: true,
      };
      setSources([...sources, newSource]);
    }
    
    setShowAddForm(false);
    setEditingSource(null);
  };

  const handleAddCategory = (categoryId: string) => {
    const category = PREDEFINED_CATEGORIES.find(c => c.id === categoryId);
    if (category && !sources.some(s => s.type === 'category' && s.name === category.name)) {
      const newSource: ContentSource = {
        id: Date.now().toString(),
        type: 'category',
        name: category.name,
        priority: 'medium',
        active: true,
        description: category.description,
      };
      setSources([...sources, newSource]);
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Add Categories
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {PREDEFINED_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleAddCategory(category.id)}
                  disabled={sources.some(s => s.type === 'category' && s.name === category.name)}
                  className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                    sources.some(s => s.type === 'category' && s.name === category.name)
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <div className="font-medium text-sm">{category.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{category.description}</div>
                </button>
              ))}
            </div>
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
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ContentSource['type'] })}
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
                  {formData.type === 'rss' ? 'RSS Feed URL' : 'URL or Username'}
                </label>
                <Input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder={SOURCE_TYPES.find(t => t.id === formData.type)?.placeholder}
                />
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
                  onClick={() => setShowAddForm(false)}
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