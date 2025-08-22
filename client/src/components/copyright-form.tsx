import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Upload, Plus, Trash2, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CopyrightFormProps {
  projectId: string;
}

// Copyright form schema
const copyrightSchema = z.object({
  penName: z.string().optional(),
  address: z.string().optional(),
  yearOfPublication: z.number().min(1900).max(2100).optional(),
  epubIsbn: z.string().optional(),
  paperbackIsbn: z.string().optional(),
  pdfIsbn: z.string().optional(),
  publisherName: z.string().optional(),
  publisherLogo: z.string().optional(),
  collaborators: z.array(z.object({
    name: z.string(),
    role: z.string(),
  })).default([]),
  includeAllRightsReserved: z.boolean().default(false),
  includeBasicNotice: z.boolean().default(false),
  includeExtendedNotice: z.boolean().default(false),
  includeRegistrationNotice: z.boolean().default(false),
  customCopyrightText: z.string().optional(),
});

type CopyrightFormData = z.infer<typeof copyrightSchema>;

export default function CopyrightForm({ projectId }: CopyrightFormProps) {
  const [collaborators, setCollaborators] = useState<Array<{name: string, role: string}>>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing copyright info
  const { data: copyrightInfo, isLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "copyright"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/projects/${projectId}/copyright`);
      return response.json();
    },
  });

  const form = useForm<CopyrightFormData>({
    resolver: zodResolver(copyrightSchema),
    defaultValues: {
      yearOfPublication: new Date().getFullYear(),
      collaborators: [],
      includeAllRightsReserved: false,
      includeBasicNotice: false,
      includeExtendedNotice: false,
      includeRegistrationNotice: false,
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (copyrightInfo) {
      form.reset({
        penName: copyrightInfo.penName || "",
        address: copyrightInfo.address || "",
        yearOfPublication: copyrightInfo.yearOfPublication || new Date().getFullYear(),
        epubIsbn: copyrightInfo.epubIsbn || "",
        paperbackIsbn: copyrightInfo.paperbackIsbn || "",
        pdfIsbn: copyrightInfo.pdfIsbn || "",
        publisherName: copyrightInfo.publisherName || "",
        publisherLogo: copyrightInfo.publisherLogo || "",
        collaborators: copyrightInfo.collaborators || [],
        includeAllRightsReserved: copyrightInfo.includeAllRightsReserved || false,
        includeBasicNotice: copyrightInfo.includeBasicNotice || false,
        includeExtendedNotice: copyrightInfo.includeExtendedNotice || false,
        includeRegistrationNotice: copyrightInfo.includeRegistrationNotice || false,
        customCopyrightText: copyrightInfo.customCopyrightText || "",
      });
      setCollaborators(copyrightInfo.collaborators || []);
      setLogoPreview(copyrightInfo.publisherLogo || null);
    }
  }, [copyrightInfo, form]);

  const saveCopyrightMutation = useMutation({
    mutationFn: async (data: CopyrightFormData) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/copyright`, {
        ...data,
        collaborators,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "copyright"] });
      toast({
        title: "Copyright information saved",
        description: "Your copyright details have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save copyright information. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Logo upload mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch(`/api/projects/${projectId}/copyright/upload-logo`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload logo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setLogoPreview(data.logoUrl);
      form.setValue('publisherLogo', data.logoUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "copyright"] });
      toast({
        title: "Logo uploaded successfully",
        description: "Your publisher logo has been saved.",
      });
      setIsUploading(false);
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLogoMutation.mutate(file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    form.setValue('publisherLogo', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = (data: CopyrightFormData) => {
    saveCopyrightMutation.mutate(data);
  };

  const addCollaborator = () => {
    setCollaborators([...collaborators, { name: "", role: "" }]);
  };

  const removeCollaborator = (index: number) => {
    const updated = collaborators.filter((_, i) => i !== index);
    setCollaborators(updated);
  };

  const updateCollaborator = (index: number, field: string, value: string) => {
    const updated = [...collaborators];
    updated[index] = { ...updated[index], [field]: value };
    setCollaborators(updated);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-neutral-100">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-800 mb-2">Copyright</h1>
            <p className="text-neutral-600">
              Configure your copyright page information to match your book's publishing details.
            </p>
          </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Book Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Book details</CardTitle>
              <p className="text-sm text-neutral-600">
                These will appear on your copyright page. Please configure the relevant information below. Want more control? Use the advanced view.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="penName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pen name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Campbell" {...field} data-testid="pen-name-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Your publishing address..." 
                        className="min-h-[100px]"
                        {...field} 
                        data-testid="address-input" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Year of Publication */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Year of publication</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="yearOfPublication"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1900} 
                        max={2100}
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || new Date().getFullYear())}
                        data-testid="year-input" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="epubIsbn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        EPUB <span className="text-xs text-neutral-500">Format</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="978-0-26-000000-0" {...field} data-testid="epub-isbn-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paperbackIsbn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Paperback <span className="text-xs text-neutral-500">Hardcover</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="978-0-26-000000-0" {...field} data-testid="paperback-isbn-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pdfIsbn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PDF</FormLabel>
                      <FormControl>
                        <Input placeholder="978-0-26-000000-0" {...field} data-testid="pdf-isbn-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Publisher */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Publisher name</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="publisherName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="AShmey Clement" {...field} data-testid="publisher-name-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Publisher Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Publisher logo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 border-2 border-dashed border-neutral-200 rounded-lg flex items-center justify-center bg-neutral-50 relative">
                  {logoPreview ? (
                    <>
                      <img 
                        src={logoPreview} 
                        alt="Publisher logo" 
                        className="max-w-full max-h-full object-contain rounded"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white"
                        onClick={removeLogo}
                        data-testid="remove-logo"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-neutral-400">Logo preview</span>
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="logo-file-input"
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="upload-logo-button"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload Logo"}
                  </Button>
                  <p className="text-xs text-neutral-500 mt-2">
                    Max 5MB • JPG, PNG, GIF
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collaborators */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Collaborators</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {collaborators.map((collaborator, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <Input
                      placeholder="Collaborator name"
                      value={collaborator.name}
                      onChange={(e) => updateCollaborator(index, "name", e.target.value)}
                      data-testid={`collaborator-name-${index}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2">Role</label>
                      <Select
                        value={collaborator.role}
                        onValueChange={(value) => updateCollaborator(index, "role", value)}
                      >
                        <SelectTrigger data-testid={`collaborator-role-${index}`}>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="author">Author</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="illustrator">Illustrator</SelectItem>
                          <SelectItem value="translator">Translator</SelectItem>
                          <SelectItem value="contributor">Contributor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-8"
                      onClick={() => removeCollaborator(index)}
                      data-testid={`remove-collaborator-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={addCollaborator}
                data-testid="add-collaborator"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add collaborator
              </Button>
            </CardContent>
          </Card>

          {/* Clauses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clauses</CardTitle>
              <p className="text-sm text-neutral-600">
                Choose the clauses that appear on your copyright page. All the rights that follow apply to the whole book.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="includeAllRightsReserved"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="all-rights-reserved-checkbox"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>All rights reserved</FormLabel>
                      <p className="text-sm text-neutral-600">
                        This work is protected by copyright. All rights are reserved. This work or any portion thereof may not be reproduced or used in any manner whatsoever without the express written permission of the publisher except for the use of brief quotations in a book review.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includeBasicNotice"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="basic-notice-checkbox"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Basic notice</FormLabel>
                      <p className="text-sm text-neutral-600">
                        This is a work of fiction. Any resemblance to actual persons, living or dead, or actual events is purely coincidental.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includeExtendedNotice"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="extended-notice-checkbox"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Extended disclaimer</FormLabel>
                      <p className="text-sm text-neutral-600">
                        This is a work of fiction. Names, characters, businesses, places, events, locales, and incidents are either the products of the author's imagination or used in a fictitious manner.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includeRegistrationNotice"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="registration-notice-checkbox"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Registration notice</FormLabel>
                      <p className="text-sm text-neutral-600">
                        Registration notice helps establish the date of first publication and may be beneficial for legal protection.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customCopyrightText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom copyright text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional copyright text..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="custom-copyright-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-6">
            <Button 
              type="submit" 
              disabled={saveCopyrightMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="save-copyright-button"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveCopyrightMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Form>
        </div>
      </div>
    </div>
  );
}