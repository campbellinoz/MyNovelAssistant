import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Clock, 
  Globe, 
  MessageSquare, 
  Plus, 
  Send, 
  Ticket, 
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Mail
} from "lucide-react";
import type { SupportTicket, SupportTicketMessage } from "@shared/schema";

export default function Support() {
  const [activeTab, setActiveTab] = useState<"tickets" | "create" | "contact">("tickets");
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();

  // Fetch support tickets
  const { data: tickets = [], isLoading: ticketsLoading, error: ticketsError } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support/tickets"],
    retry: false,
  });

  // Fetch ticket messages
  const { data: messages = [] } = useQuery<SupportTicketMessage[]>({
    queryKey: ["/api/support/tickets", selectedTicket, "messages"],
    enabled: !!selectedTicket,
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; category: string; priority: string }) => {
      return apiRequest("POST", "/api/support/tickets", data);
    },
    onSuccess: () => {
      toast({
        title: "Support Ticket Created",
        description: "Your ticket has been submitted successfully. We'll respond within 24-48 hours.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      setActiveTab("tickets");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create support ticket",
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { ticketId: string; message: string }) => {
      return apiRequest("POST", `/api/support/tickets/${data.ticketId}/messages`, {
        message: data.message,
      });
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been added to the ticket.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets", selectedTicket, "messages"] });
      setNewMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleCreateTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTicketMutation.mutate({
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
      category: formData.get("category") as string,
      priority: formData.get("priority") as string,
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim()) return;
    sendMessageMutation.mutate({
      ticketId: selectedTicket,
      message: newMessage,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-yellow-100 text-yellow-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "closed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center mb-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Center</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Get help with MyNovelCraft</p>
          </div>
        </div>

        {/* Response Time Notice */}
        <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">Support Response Times</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  All enquiries will be answered promptly. Response times are subject to timezone delays as our support operates across different time zones. Typical response times:
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                  <li>• <strong>General Support:</strong> Within 24-48 hours</li>
                  <li>• <strong>Technical Issues:</strong> Within 12-24 hours</li>
                  <li>• <strong>Billing Questions:</strong> Within 6-12 hours</li>
                  <li>• <strong>Urgent Issues:</strong> We aim to respond within 2-4 hours</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-white dark:bg-gray-800 rounded-lg p-1">
          <Button
            variant={activeTab === "tickets" ? "default" : "ghost"}
            onClick={() => setActiveTab("tickets")}
            className="flex-1"
          >
            <Ticket className="w-4 h-4 mr-2" />
            My Tickets
          </Button>
          <Button
            variant={activeTab === "create" ? "default" : "ghost"}
            onClick={() => setActiveTab("create")}
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
          <Button
            variant={activeTab === "contact" ? "default" : "ghost"}
            onClick={() => setActiveTab("contact")}
            className="flex-1"
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact Info
          </Button>
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === "tickets" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Ticket className="w-5 h-5 mr-2" />
                    Support Tickets
                  </CardTitle>
                  <CardDescription>
                    Track your support requests and communications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ticketsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center py-8">
                      <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tickets yet</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Create your first support ticket to get help with MyNovelCraft
                      </p>
                      <Button onClick={() => setActiveTab("create")}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Ticket
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tickets.map((ticket: SupportTicket) => (
                        <div
                          key={ticket.id}
                          className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => setSelectedTicket(ticket.id)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">{ticket.subject}</h3>
                            <div className="flex space-x-2">
                              <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                              <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {ticket.message.substring(0, 150)}...
                          </p>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>Category: {ticket.category}</span>
                            <span>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'Unknown'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "create" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Support Ticket
                  </CardTitle>
                  <CardDescription>
                    Describe your issue and we'll help you resolve it
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateTicket} className="space-y-4">
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        name="subject"
                        placeholder="Brief description of your issue"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select name="category" defaultValue="general">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Support</SelectItem>
                            <SelectItem value="technical">Technical Issue</SelectItem>
                            <SelectItem value="billing">Billing & Subscriptions</SelectItem>
                            <SelectItem value="feature_request">Feature Request</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select name="priority" defaultValue="medium">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable..."
                        rows={6}
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createTicketMutation.isPending}
                    >
                      {createTicketMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Creating Ticket...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Create Ticket
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === "contact" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="w-5 h-5 mr-2" />
                    Contact Information
                  </CardTitle>
                  <CardDescription>
                    Alternative ways to reach our support team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Support Tickets</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Our ticket system is the fastest way to get help. All tickets are tracked and you'll receive updates via email.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Response Times</h3>
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                          <div className="flex justify-between">
                            <span>General Support:</span>
                            <span>24-48 hours</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Technical Issues:</span>
                            <span>12-24 hours</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Billing Questions:</span>
                            <span>6-12 hours</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Urgent Issues:</span>
                            <span>2-4 hours</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">What to Include</h3>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          <li>• Detailed description of the issue</li>
                          <li>• Steps to reproduce the problem</li>
                          <li>• Screenshots if applicable</li>
                          <li>• Your browser and device information</li>
                          <li>• Any error messages you received</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Our Commitment</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          We're committed to providing excellent support to all MyNovelCraft users. Every inquiry will receive a response, and we'll work with you until your issue is resolved. Please note that responses are subject to timezone delays.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {selectedTicket && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Ticket Conversation
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTicket(null)}
                  >
                    Close
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96 mb-4">
                    <div className="space-y-4">
                      {messages.map((message: SupportTicketMessage) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg ${
                            message.isAdmin
                              ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                              : "bg-gray-50 dark:bg-gray-700"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <Badge variant={message.isAdmin ? "default" : "secondary"}>
                              {message.isAdmin ? "Support Team" : "You"}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {message.createdAt ? new Date(message.createdAt).toLocaleString() : 'Unknown'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {message.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      rows={3}
                    />
                    <Button 
                      type="submit" 
                      size="sm" 
                      className="w-full"
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Quick Help */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HelpCircle className="w-5 h-5 mr-2" />
                  Quick Help
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/documentation">
                  <Button variant="outline" className="w-full justify-start">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    View Documentation
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setActiveTab("create")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Report a Bug
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setActiveTab("create")}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Request Feature
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}