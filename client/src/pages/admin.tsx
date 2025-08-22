import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Download, 
  Search, 
  Filter, 
  Crown, 
  DollarSign, 
  Calendar,
  Mail,
  User,
  Shield,
  AlertTriangle,
  ArrowLeft,
  Home
} from 'lucide-react';
import { Link } from 'wouter';

interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionTier: 'free' | 'basic' | 'pro' | 'premium';
  subscriptionStatus: string;
  monthlyAiQueries: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  paypalSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalSubscribers: number;
  freeUsers: number;
  basicUsers: number;
  proUsers: number;
  premiumUsers: number;
  monthlyRevenue: number;
  totalRevenue: number;
}

export default function Admin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  // Fetch admin stats
  const { data: stats, error: statsError, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    retry: false,
  });

  // Fetch all users
  const { data: users = [], isLoading, error: usersError } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users/all'],
    retry: false,
  });

  // Export users mutation
  const exportUsersMutation = useMutation({
    mutationFn: async ({ format }: { format: 'csv' | 'json' }) => {
      const response = await apiRequest('GET', `/api/admin/export?format=${format}`);
      return response.blob();
    },
    onSuccess: (blob, variables) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers_${new Date().toISOString().split('T')[0]}.${variables.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Completed",
        description: `Subscriber data exported as ${variables.format.toUpperCase()}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    },
  });

  // Update subscription mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, tier, status, subscriptionEndDate }: { userId: string; tier: string; status: string; subscriptionEndDate?: string }) => {
      const response = await apiRequest('POST', '/api/admin/update-subscription', { userId, tier, status, subscriptionEndDate });
      return response.json();
    },
    onSuccess: async (data, variables) => {
      // Update the selected user state immediately with new data
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          subscriptionTier: variables.tier as any,
          subscriptionStatus: variables.status,
          subscriptionEndDate: variables.subscriptionEndDate || undefined
        });
      }
      
      // Refresh the data in background
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      
      // Show success message
      toast({
        title: "Subscription Updated",
        description: "User subscription has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTier = filterTier === 'all' || user.subscriptionTier === filterTier;
    
    return matchesSearch && matchesTier;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'premium': return 'default';
      case 'pro': return 'secondary'; 
      case 'basic': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage subscribers and view analytics</p>
          </div>
        </div>
        <Badge variant="destructive" className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Admin Access
        </Badge>
      </div>

      {/* Admin Access Warning */}
      <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          <p className="font-semibold">Admin Dashboard</p>
          <p className="text-sm mt-1">
            This page contains sensitive user information. Ensure compliance with privacy regulations 
            and data protection laws when handling subscriber data.
          </p>
        </AlertDescription>
      </Alert>

      {/* Debug Information for Production */}
      {(statsError || usersError) && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <p className="font-semibold">API Connection Issues</p>
            {statsError && <p className="text-sm mt-1">Stats Error: {(statsError as any)?.message || 'Failed to load statistics'}</p>}
            {usersError && <p className="text-sm mt-1">Users Error: {(usersError as any)?.message || 'Failed to load user data'}</p>}
            <p className="text-sm mt-2">This may be due to authentication or server connectivity issues.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1,2,3,4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalSubscribers} active subscribers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.totalRevenue)} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.premiumUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats.proUsers} pro, {stats.basicUsers} basic
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Free Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.freeUsers}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.totalSubscribers / stats.totalUsers) * 100)}% conversion
              </p>
            </CardContent>
          </Card>
        </div>
      ) : !statsError ? (
        <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <p className="font-semibold">No Statistics Available</p>
            <p className="text-sm mt-1">Unable to load admin statistics. Check your connection and permissions.</p>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Filters and Export */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 items-center w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportUsersMutation.mutate({ format: 'csv' })}
                disabled={exportUsersMutation.isPending}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportUsersMutation.mutate({ format: 'json' })}
                disabled={exportUsersMutation.isPending}
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Subscribers ({filteredUsers.length})
            {isLoading && <span className="text-sm font-normal text-muted-foreground ml-2">(Loading...)</span>}
            {usersError && <span className="text-sm font-normal text-red-500 ml-2">(Error loading users)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Subscription End</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">
                      {user.firstName || user.lastName 
                        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                        : 'Unknown User'
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTierBadgeVariant(user.subscriptionTier)} className="capitalize">
                      {user.subscriptionTier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                      {user.subscriptionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {user.monthlyAiQueries} queries
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {user.subscriptionEndDate 
                        ? new Date(user.subscriptionEndDate).toLocaleDateString()
                        : 'Never'
                      }
                      {!user.subscriptionEndDate && user.subscriptionTier !== 'free' && (
                        <span className="text-green-600 font-medium"> (Permanent)</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          Manage
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Manage User Subscription</DialogTitle>
                          <DialogDescription>
                            Update subscription tier, status, and end date for this user.
                          </DialogDescription>
                        </DialogHeader>
                        {selectedUser && (
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold">User Information</h4>
                              <p className="text-sm text-muted-foreground">Email: {selectedUser.email}</p>
                              <p className="text-sm text-muted-foreground">
                                Name: {selectedUser.firstName || selectedUser.lastName 
                                  ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()
                                  : 'Not provided'
                                }
                              </p>
                              <p className="text-sm text-muted-foreground">
                                PayPal ID: {selectedUser.paypalSubscriptionId || 'None'}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Subscription Tier</label>
                                <Select 
                                  defaultValue={selectedUser.subscriptionTier}
                                  onValueChange={(value) => setSelectedUser({...selectedUser, subscriptionTier: value as any})}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="basic">Basic</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                    <SelectItem value="pro">Studio</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Status</label>
                                <Select 
                                  defaultValue={selectedUser.subscriptionStatus}
                                  onValueChange={(value) => setSelectedUser({...selectedUser, subscriptionStatus: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center space-x-2 mb-2">
                                <input
                                  type="checkbox"
                                  id="noExpiration"
                                  checked={!selectedUser.subscriptionEndDate}
                                  onChange={(e) => setSelectedUser({
                                    ...selectedUser,
                                    subscriptionEndDate: e.target.checked ? undefined : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                                  })}
                                  className="rounded border-gray-300"
                                />
                                <label htmlFor="noExpiration" className="text-sm font-medium">
                                  No expiration date (permanent access)
                                </label>
                              </div>
                              
                              {selectedUser.subscriptionEndDate && (
                                <div>
                                  <label className="text-sm font-medium">Subscription End Date</label>
                                  <Input
                                    type="date"
                                    value={new Date(selectedUser.subscriptionEndDate).toISOString().split('T')[0]}
                                    onChange={(e) => setSelectedUser({
                                      ...selectedUser, 
                                      subscriptionEndDate: e.target.value ? new Date(e.target.value).toISOString() : undefined
                                    })}
                                    className="mt-1"
                                  />
                                </div>
                              )}
                              
                              <p className="text-xs text-muted-foreground mt-1">
                                Check "No expiration date" to grant permanent access to paid tier features
                              </p>
                            </div>
                            
                            <Button
                              onClick={() => updateSubscriptionMutation.mutate({
                                userId: selectedUser.id,
                                tier: selectedUser.subscriptionTier,
                                status: selectedUser.subscriptionStatus,
                                subscriptionEndDate: selectedUser.subscriptionEndDate
                              })}
                              disabled={updateSubscriptionMutation.isPending}
                              className="w-full"
                            >
                              {updateSubscriptionMutation.isPending ? 'Updating...' : 'Update Subscription'}
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}