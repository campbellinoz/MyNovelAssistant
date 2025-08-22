import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCharacterSchema, type Character, type InsertCharacter } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, User } from "lucide-react";

interface CharacterModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CharacterModal({ projectId, isOpen, onClose }: CharacterModalProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: characters = [] } = useQuery<Character[]>({
    queryKey: ["/api/projects", projectId, "characters"],
    enabled: isOpen,
  });

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

  const createCharacterMutation = useMutation({
    mutationFn: async (data: InsertCharacter) => {
      const response = await apiRequest("POST", "/api/characters", data);
      return response.json();
    },
    onSuccess: (newCharacter) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "characters"] });
      setSelectedCharacterId(newCharacter.id);
      form.reset();
      toast({
        title: "Character created",
        description: "Your new character has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create character. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCharacterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCharacter> }) => {
      const response = await apiRequest("PATCH", `/api/characters/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "characters"] });
      toast({
        title: "Character updated",
        description: "Character details have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update character. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCharacterMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/characters/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "characters"] });
      setSelectedCharacterId(null);
      toast({
        title: "Character deleted",
        description: "The character has been removed from your project.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete character. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertCharacter>({
    resolver: zodResolver(insertCharacterSchema),
    defaultValues: {
      projectId,
      name: "",
      role: "",
      description: "",
    },
  });

  const detailsForm = useForm<InsertCharacter>({
    resolver: zodResolver(insertCharacterSchema),
    defaultValues: selectedCharacter || {
      projectId,
      name: "",
      role: "",
      description: "",
    },
  });

  // Update form when selected character changes
  useState(() => {
    if (selectedCharacter) {
      detailsForm.reset({
        name: selectedCharacter.name,
        role: selectedCharacter.role,
        description: selectedCharacter.description || "",
        projectId,
      });
    }
  });

  const onCreateSubmit = (data: InsertCharacter) => {
    createCharacterMutation.mutate(data);
  };

  const onUpdateSubmit = (data: InsertCharacter) => {
    if (selectedCharacter) {
      updateCharacterMutation.mutate({
        id: selectedCharacter.id,
        data,
      });
    }
  };

  const handleClose = () => {
    setSelectedCharacterId(null);
    form.reset();
    detailsForm.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Character Manager</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Characters List */}
          <div className="w-1/3 border-r border-neutral-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-neutral-800">Characters</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newCharacter: InsertCharacter = {
                    projectId,
                    name: "New Character",
                    role: "Supporting Character",
                    description: "",
                  };
                  createCharacterMutation.mutate(newCharacter);
                }}
                disabled={createCharacterMutation.isPending}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {characters.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">No characters yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const newCharacter: InsertCharacter = {
                      projectId,
                      name: "New Character",
                      role: "Protagonist",
                      description: "",
                    };
                    createCharacterMutation.mutate(newCharacter);
                  }}
                  disabled={createCharacterMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Character
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {characters.map((character) => (
                  <div
                    key={character.id}
                    className={`
                      p-3 rounded-lg cursor-pointer transition-colors duration-200
                      ${character.id === selectedCharacterId 
                        ? 'bg-primary text-white' 
                        : 'hover:bg-neutral-50'
                      }
                    `}
                    onClick={() => setSelectedCharacterId(character.id)}
                  >
                    <h4 className={`font-medium ${
                      character.id === selectedCharacterId ? 'text-white' : 'text-neutral-800'
                    }`}>
                      {character.name}
                    </h4>
                    <p className={`text-xs ${
                      character.id === selectedCharacterId ? 'text-white opacity-80' : 'text-neutral-400'
                    }`}>
                      {character.role}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Character Details */}
          <div className="flex-1 p-6">
            {selectedCharacter ? (
              <form onSubmit={detailsForm.handleSubmit(onUpdateSubmit)} className="space-y-6">
                <div>
                  <Label htmlFor="name">Character Name</Label>
                  <Input
                    id="name"
                    {...detailsForm.register("name")}
                    className="mt-1"
                  />
                  {detailsForm.formState.errors.name && (
                    <p className="text-sm text-red-600 mt-1">
                      {detailsForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={detailsForm.watch("role")}
                    onValueChange={(value) => detailsForm.setValue("role", value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select character role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Protagonist">Protagonist</SelectItem>
                      <SelectItem value="Antagonist">Antagonist</SelectItem>
                      <SelectItem value="Supporting Character">Supporting Character</SelectItem>
                      <SelectItem value="Mentor">Mentor</SelectItem>
                      <SelectItem value="Love Interest">Love Interest</SelectItem>
                      <SelectItem value="Comic Relief">Comic Relief</SelectItem>
                      <SelectItem value="Foil">Foil</SelectItem>
                    </SelectContent>
                  </Select>
                  {detailsForm.formState.errors.role && (
                    <p className="text-sm text-red-600 mt-1">
                      {detailsForm.formState.errors.role.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...detailsForm.register("description")}
                    rows={6}
                    className="mt-1"
                    placeholder="Describe your character's appearance, personality, background, motivations..."
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={updateCharacterMutation.isPending}
                  >
                    {updateCharacterMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this character?")) {
                        deleteCharacterMutation.mutate(selectedCharacter.id);
                      }
                    }}
                    disabled={deleteCharacterMutation.isPending}
                  >
                    {deleteCharacterMutation.isPending ? "Deleting..." : "Delete Character"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <User className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-800 mb-2">
                    Select a character
                  </h3>
                  <p className="text-neutral-600">
                    Choose a character from the left to view and edit their details.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
