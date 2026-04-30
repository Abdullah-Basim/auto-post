'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LineChart, BarChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export function MainDashboard() {
  const [stats, setStats] = useState({
    totalComments: 0,
    repliesGenerated: 0,
    repliesApproved: 0,
    repliesPosted: 0,
    autonomyEnabled: false,
  })

  const [chartData] = useState([
    { date: 'Today', comments: 12, replies: 8, posted: 5 },
    { date: 'Yesterday', comments: 15, replies: 12, posted: 10 },
    { date: '2 days ago', comments: 10, replies: 7, posted: 6 },
    { date: '3 days ago', comments: 18, replies: 14, posted: 12 },
  ])

  useEffect(() => {
    // Load stats from API
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // In a real app, fetch from /api/dashboard/stats
      setStats({
        totalComments: 127,
        repliesGenerated: 98,
        repliesApproved: 76,
        repliesPosted: 54,
        autonomyEnabled: false,
      })
    } catch (error) {
      console.error('[v0] Load stats error:', error)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to Ghost Reply</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Settings</Button>
          <Button>New Post</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalComments}</div>
            <p className="text-xs text-muted-foreground">Across all platforms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Replies Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.repliesGenerated}</div>
            <p className="text-xs text-muted-foreground">By AI Agent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.repliesApproved}</div>
            <p className="text-xs text-muted-foreground">
              {stats.repliesGenerated > 0
                ? Math.round((stats.repliesApproved / stats.repliesGenerated) * 100)
                : 0}
              % approval rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Posted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.repliesPosted}</div>
            <p className="text-xs text-muted-foreground">Published to platforms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Autonomy Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              className={
                stats.autonomyEnabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }
            >
              {stats.autonomyEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <p className="mt-2 text-xs text-muted-foreground">
              {stats.autonomyEnabled ? 'Auto-posting replies' : 'Manual approval only'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Overview</CardTitle>
          <CardDescription>Comments, replies, and posts over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="comments" stroke="#3b82f6" />
              <Line type="monotone" dataKey="replies" stroke="#10b981" />
              <Line type="monotone" dataKey="posted" stroke="#f59e0b" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Button variant="outline" className="w-full">
            View Comments
          </Button>
          <Button variant="outline" className="w-full">
            Draft New Post
          </Button>
          <Button variant="outline" className="w-full">
            Autonomy Settings
          </Button>
          <Button variant="outline" className="w-full">
            Platform Connections
          </Button>
          <Button variant="outline" className="w-full">
            View Analytics
          </Button>
          <Button variant="outline" className="w-full">
            Schedule Post
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest engagement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <p className="font-medium">New comment from John Doe</p>
              <p className="text-xs text-muted-foreground">2 minutes ago</p>
            </div>
            <Badge>Positive</Badge>
          </div>
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <p className="font-medium">Reply posted to Instagram</p>
              <p className="text-xs text-muted-foreground">15 minutes ago</p>
            </div>
            <Badge className="bg-green-100 text-green-800">Posted</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">2 new comments from LinkedIn</p>
              <p className="text-xs text-muted-foreground">1 hour ago</p>
            </div>
            <Badge>Questions</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
