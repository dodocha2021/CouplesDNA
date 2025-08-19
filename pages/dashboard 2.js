import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

function Dashboard() {
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error.message)
        return
      }
      
      // Redirect to home page
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="w-full border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img
                src="/couplesdna-ai.png"
                alt="CouplesDNA logo"
                className="size-7 object-contain"
              />
              <h1 className="text-base font-bold md:text-xl">CouplesDNA</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                Profile
              </Button>
              <Button variant="default" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to your Dashboard</h1>
          <p className="text-xl text-gray-600">
            Your relationship analysis and insights are ready for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">💕</span>
                Love Expressions
              </CardTitle>
              <CardDescription>
                How you both express and receive love
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Discover the subtle ways love flows in your relationship.
              </p>
              <Button className="w-full">View Analysis</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🔄</span>
                Communication Patterns
              </CardTitle>
              <CardDescription>
                Recurring patterns in your conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Identify cycles that strengthen or challenge your connection.
              </p>
              <Button className="w-full">Explore Patterns</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">💪</span>
                Relationship Strengths
              </CardTitle>
              <CardDescription>
                Your unique communication superpowers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Celebrate what makes your relationship strong.
              </p>
              <Button className="w-full">See Strengths</Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Continue your relationship journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="flex-1">
                Upload New Conversation
              </Button>
              <Button variant="outline" className="flex-1">
                Generate New Report
              </Button>
              <Button variant="secondary" className="flex-1">
                View Chat History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest insights and analyses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Conversation Analysis</h4>
                  <p className="text-sm text-gray-600">Generated 2 hours ago</p>
                </div>
                <Button variant="outline" size="sm">
                  View Report
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">New Chat Session</h4>
                  <p className="text-sm text-gray-600">Started yesterday</p>
                </div>
                <Button variant="outline" size="sm">
                  Continue Chat
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Weekly Insights</h4>
                  <p className="text-sm text-gray-600">Available now</p>
                </div>
                <Button variant="outline" size="sm">
                  Read Insights
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;