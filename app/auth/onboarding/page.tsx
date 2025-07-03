'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Onboarding step components (to be implemented in subsequent sub-tasks)
const WelcomeStep = ({ onNext }: { onNext: () => void }) => (
  <div className="text-center space-y-6">
    <div className="space-y-4">
      <h1 className="text-4xl font-bold text-gray-900">
        Welcome to ZenFeed!
      </h1>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto">
        Let's set up your personalized content experience in just a few steps.
      </p>
      <p className="text-lg text-gray-500">
        We'll help you choose your interests and set healthy time limits for mindful content consumption.
      </p>
    </div>
    <Button onClick={onNext} size="lg" className="px-8">
      Get Started
    </Button>
  </div>
);

// Interest categories with icons and descriptions
const INTEREST_CATEGORIES = [
  { 
    id: 'technology', 
    name: 'Technology', 
    icon: '💻', 
    description: 'Tech news, gadgets, programming, AI'
  },
  { 
    id: 'business', 
    name: 'Business', 
    icon: '💼', 
    description: 'Entrepreneurship, finance, startup news'
  },
  { 
    id: 'science', 
    name: 'Science', 
    icon: '🔬', 
    description: 'Research, discoveries, space, medicine'
  },
  { 
    id: 'health-fitness', 
    name: 'Health & Fitness', 
    icon: '🏃‍♂️', 
    description: 'Wellness, nutrition, workout, mental health'
  },
  { 
    id: 'education', 
    name: 'Education', 
    icon: '📚', 
    description: 'Learning, tutorials, courses, skills'
  },
  { 
    id: 'entertainment', 
    name: 'Entertainment', 
    icon: '🎬', 
    description: 'Movies, TV shows, celebrities, pop culture'
  },
  { 
    id: 'sports', 
    name: 'Sports', 
    icon: '⚽', 
    description: 'Games, athletes, teams, sports news'
  },
  { 
    id: 'news-politics', 
    name: 'News & Politics', 
    icon: '📰', 
    description: 'Current events, politics, world news'
  },
  { 
    id: 'arts-culture', 
    name: 'Arts & Culture', 
    icon: '🎨', 
    description: 'Art, music, literature, photography'
  },
  { 
    id: 'travel', 
    name: 'Travel', 
    icon: '✈️', 
    description: 'Destinations, travel tips, culture'
  },
  { 
    id: 'food-cooking', 
    name: 'Food & Cooking', 
    icon: '🍳', 
    description: 'Recipes, restaurants, food culture'
  },
  { 
    id: 'lifestyle', 
    name: 'Lifestyle', 
    icon: '🌟', 
    description: 'Fashion, home decor, personal development'
  },
  { 
    id: 'gaming', 
    name: 'Gaming', 
    icon: '🎮', 
    description: 'Video games, esports, gaming news'
  },
  { 
    id: 'finance', 
    name: 'Finance', 
    icon: '💰', 
    description: 'Investing, cryptocurrency, personal finance'
  },
  { 
    id: 'environment', 
    name: 'Environment', 
    icon: '🌱', 
    description: 'Climate, sustainability, nature'
  },
];

const InterestsStep = ({ 
  onNext, 
  onBack, 
  selectedInterests, 
  setSelectedInterests 
}: { 
  onNext: () => void; 
  onBack: () => void;
  selectedInterests: string[];
  setSelectedInterests: (interests: string[]) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInterests = INTEREST_CATEGORIES.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleInterest = (interestId: string) => {
    const newInterests = selectedInterests.includes(interestId)
      ? selectedInterests.filter(id => id !== interestId)
      : [...selectedInterests, interestId];
    setSelectedInterests(newInterests);
  };

  const isSelected = (interestId: string) => selectedInterests.includes(interestId);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-gray-900">
          What interests you?
        </h2>
        <p className="text-lg text-gray-600">
          Select 3-15 topics you'd like to see in your curated content sessions.
        </p>
        <p className="text-sm text-gray-500">
          Selected: {selectedInterests.length} interests
        </p>
      </div>

      {/* Search bar */}
      <div className="max-w-md mx-auto">
        <Input
          type="text"
          placeholder="Search interests..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Interest grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {filteredInterests.map((category) => (
          <div
            key={category.id}
            onClick={() => toggleInterest(category.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleInterest(category.id);
              }
            }}
            role="checkbox"
            aria-checked={isSelected(category.id)}
            aria-label={`${category.name}: ${category.description}`}
            tabIndex={0}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
              isSelected(category.id)
                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl flex-shrink-0">{category.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-sm ${
                  isSelected(category.id) ? 'text-indigo-900' : 'text-gray-900'
                }`}>
                  {category.name}
                </h3>
                <p className={`text-xs mt-1 ${
                  isSelected(category.id) ? 'text-indigo-700' : 'text-gray-600'
                }`}>
                  {category.description}
                </p>
              </div>
              {isSelected(category.id) && (
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredInterests.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No interests found matching "{searchTerm}"</p>
        </div>
      )}

      {/* Quick select options */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Quick select:</h4>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedInterests(['technology', 'business', 'science', 'education'])}
            className="text-xs"
          >
            Professional
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedInterests(['entertainment', 'sports', 'gaming', 'arts-culture'])}
            className="text-xs"
          >
            Entertainment
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedInterests(['health-fitness', 'food-cooking', 'travel', 'lifestyle'])}
            className="text-xs"
          >
            Lifestyle
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedInterests([])}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={onNext} 
          disabled={selectedInterests.length < 3}
          className={selectedInterests.length < 3 ? 'opacity-50 cursor-not-allowed' : ''}
        >
          Continue
          {selectedInterests.length < 3 && (
            <span className="ml-1 text-xs">
              (select {3 - selectedInterests.length} more)
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};

// Predefined session duration options
const SESSION_DURATIONS = [
  { minutes: 15, label: '15 min', description: 'Quick break' },
  { minutes: 30, label: '30 min', description: 'Short session' },
  { minutes: 45, label: '45 min', description: 'Medium session' },
  { minutes: 60, label: '1 hour', description: 'Standard session' },
  { minutes: 90, label: '1.5 hours', description: 'Extended session' },
  { minutes: 120, label: '2 hours', description: 'Long session' },
  { minutes: 180, label: '3 hours', description: 'Deep dive' },
  { minutes: 240, label: '4 hours', description: 'Maximum session' },
];

// Daily time limit options
const DAILY_LIMITS = [
  { minutes: 30, label: '30 min/day', description: 'Minimal usage' },
  { minutes: 60, label: '1 hour/day', description: 'Light usage' },
  { minutes: 120, label: '2 hours/day', description: 'Moderate usage' },
  { minutes: 180, label: '3 hours/day', description: 'Regular usage' },
  { minutes: 240, label: '4 hours/day', description: 'Heavy usage' },
  { minutes: -1, label: 'Unlimited', description: 'No daily limit' },
];

const TimeLimitsStep = ({ 
  onNext, 
  onBack, 
  defaultSessionDuration, 
  setDefaultSessionDuration,
  dailyTimeLimit, 
  setDailyTimeLimit,
  maxSessionsPerDay, 
  setMaxSessionsPerDay,
  isLoading 
}: { 
  onNext: () => void; 
  onBack: () => void;
  defaultSessionDuration: number;
  setDefaultSessionDuration: (duration: number) => void;
  dailyTimeLimit: number;
  setDailyTimeLimit: (limit: number) => void;
  maxSessionsPerDay: number;
  setMaxSessionsPerDay: (sessions: number) => void;
  isLoading: boolean;
}) => {
  const [customDuration, setCustomDuration] = useState('');
  const [useCustomDuration, setUseCustomDuration] = useState(false);

  const handleCustomDurationChange = (value: string) => {
    setCustomDuration(value);
    const numValue = parseInt(value);
    if (numValue >= 15 && numValue <= 240) {
      setDefaultSessionDuration(numValue);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes === -1) return 'Unlimited';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-gray-900">
          Set your time preferences
        </h2>
        <p className="text-lg text-gray-600">
          Choose how long you'd like your content sessions to last and set healthy daily limits.
        </p>
      </div>

      {/* Default Session Duration */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Default Session Duration</h3>
        <p className="text-sm text-gray-600">
          How long should your typical content session last? (15 minutes - 4 hours)
        </p>
        
        {!useCustomDuration ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SESSION_DURATIONS.map((duration) => (
              <button
                key={duration.minutes}
                onClick={() => setDefaultSessionDuration(duration.minutes)}
                className={`p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                  defaultSessionDuration === duration.minutes
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="font-semibold">{duration.label}</div>
                <div className="text-xs mt-1 opacity-75">{duration.description}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="max-w-xs">
            <Input
              type="number"
              min="15"
              max="240"
              value={customDuration}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomDurationChange(e.target.value)}
              placeholder="Enter minutes (15-240)"
              className="w-full"
            />
          </div>
        )}
        
        <button
          onClick={() => {
            setUseCustomDuration(!useCustomDuration);
            if (useCustomDuration) {
              setCustomDuration('');
              setDefaultSessionDuration(30);
            }
          }}
          className="text-sm text-indigo-600 hover:text-indigo-700 underline"
        >
          {useCustomDuration ? 'Choose from presets' : 'Enter custom duration'}
        </button>
      </div>

      {/* Daily Time Limit */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Daily Time Limit</h3>
        <p className="text-sm text-gray-600">
          Set a healthy daily limit for your total content consumption.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {DAILY_LIMITS.map((limit) => (
            <button
              key={limit.minutes}
              onClick={() => setDailyTimeLimit(limit.minutes)}
              className={`p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                dailyTimeLimit === limit.minutes
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-semibold">{limit.label}</div>
              <div className="text-xs mt-1 opacity-75">{limit.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Per Day */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Sessions Per Day</h3>
        <p className="text-sm text-gray-600">
          How many separate content sessions would you like per day?
        </p>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMaxSessionsPerDay(Math.max(1, maxSessionsPerDay - 1))}
            disabled={maxSessionsPerDay <= 1}
          >
            -
          </Button>
          <div className="flex-1 text-center">
            <span className="text-2xl font-bold text-indigo-600">{maxSessionsPerDay}</span>
            <div className="text-sm text-gray-600">session{maxSessionsPerDay > 1 ? 's' : ''} per day</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMaxSessionsPerDay(Math.min(10, maxSessionsPerDay + 1))}
            disabled={maxSessionsPerDay >= 10}
          >
            +
          </Button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Quick presets:</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMaxSessionsPerDay(1)}
              className="text-xs"
            >
              1 session
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMaxSessionsPerDay(2)}
              className="text-xs"
            >
              Morning & Evening
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMaxSessionsPerDay(3)}
              className="text-xs"
            >
              3 times daily
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMaxSessionsPerDay(5)}
              className="text-xs"
            >
              Break sessions
            </Button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <h4 className="font-semibold text-indigo-900 mb-3">Your Settings Summary:</h4>
        <ul className="space-y-2 text-sm text-indigo-800">
          <li>• Default session: <strong>{formatTime(defaultSessionDuration)}</strong></li>
          <li>• Daily limit: <strong>{formatTime(dailyTimeLimit)}</strong></li>
          <li>• Max sessions per day: <strong>{maxSessionsPerDay}</strong></li>
          {dailyTimeLimit > 0 && (
            <li className="mt-3 text-xs text-indigo-600">
              You can have up to {Math.max(1, Math.floor(dailyTimeLimit / defaultSessionDuration))} sessions of {formatTime(defaultSessionDuration)} each within your daily limit.
              {dailyTimeLimit < defaultSessionDuration && ' (Session duration exceeds daily limit)'}
            </li>
          )}
        </ul>
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button onClick={onNext} disabled={isLoading}>
          {isLoading ? 'Completing Setup...' : 'Complete Setup'}
        </Button>
      </div>
    </div>
  );
};

const STEPS = [
  { id: 'welcome', title: 'Welcome', component: WelcomeStep },
  { id: 'interests', title: 'Interests', component: InterestsStep },
  { id: 'time-limits', title: 'Time Limits', component: TimeLimitsStep },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Onboarding data state
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [defaultSessionDuration, setDefaultSessionDuration] = useState(30);
  const [dailyTimeLimit, setDailyTimeLimit] = useState(120);
  const [maxSessionsPerDay, setMaxSessionsPerDay] = useState(3);
  
  const router = useRouter();

  const handleNext = () => {
    setError(''); // Clear any previous errors
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    setError(''); // Clear any previous errors
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interests: selectedInterests,
          defaultSessionDuration,
          dailyTimeLimit,
          maxSessionsPerDay,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Onboarding completed successfully
        console.log('Onboarding completed:', data.preferences);
        router.push('/dashboard');
      } else {
        // Handle error response
        const errorMessages: Record<string, string> = {
          'unauthorized': 'Please log in to complete onboarding.',
          'invalid_interests': 'Please select valid interests.',
          'invalid_interests_count': 'Please select between 3 and 15 interests.',
          'invalid_session_duration': 'Please select a valid session duration.',
          'invalid_daily_limit': 'Please select a valid daily time limit.',
          'invalid_sessions_count': 'Please select a valid number of sessions per day.',
          'user_not_found': 'User account not found. Please log in again.',
          'user_not_verified': 'Please verify your email before completing onboarding.',
        };
        setError(errorMessages[data.error] || data.message || 'Failed to complete onboarding. Please try again.');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create enhanced step components that can interact with state
  const stepProps = {
    onNext: handleNext,
    onBack: handleBack,
    // Interest step props
    selectedInterests,
    setSelectedInterests,
    // Time limits step props
    defaultSessionDuration,
    setDefaultSessionDuration,
    dailyTimeLimit,
    setDailyTimeLimit,
    maxSessionsPerDay,
    setMaxSessionsPerDay,
    // UI state
    isLoading,
    error,
  };

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
                    index <= currentStep
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-300 text-gray-500'
                  }`}
                >
                  {index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-full h-1 mx-4 ${
                      index < currentStep ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
            </p>
          </div>
        </div>

        {/* Main content area */}
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <CurrentStepComponent {...stepProps} />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact us at{' '}
            <a href="mailto:support@zenfeed.com" className="text-indigo-600 hover:underline">
              support@zenfeed.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 