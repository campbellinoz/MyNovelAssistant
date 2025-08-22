import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  User, GitBranch, BookOpen, Plus, Edit, 
  Heart, Sword, Target, Lightbulb, Zap 
} from "lucide-react";

interface Character {
  id: string;
  projectId: string;
  name: string;
  role: string;
  description?: string;
  appearance?: string;
  characterTheme?: string;
  characterArc?: string;
  motivations?: string;
  conflicts?: string;
  backstory?: string;
  symbolism?: string;
}

interface InteractiveCharacterProfileProps {
  character: Character;
}

export default function InteractiveCharacterProfile({ character }: InteractiveCharacterProfileProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editField, setEditField] = useState<string>("");
  const [editValue, setEditValue] = useState<string>("");
  const { toast } = useToast();

  const updateCharacterMutation = useMutation({
    mutationFn: async (data: Partial<Character>) => {
      const response = await apiRequest("PATCH", `/api/characters/${character.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", character.projectId, "characters"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Character Updated",
        description: `${editField} has been updated successfully.`,
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

  const handleEdit = (field: string, currentValue: string = "") => {
    setEditField(field);
    setEditValue(currentValue);
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    const updateData = { [editField]: editValue };
    updateCharacterMutation.mutate(updateData);
  };

  const getFieldPrompt = (field: string) => {
    const prompts: Record<string, string> = {
      description: "Describe this character's personality, background, and role in the story...",
      appearance: "Describe the character's physical appearance, clothing, and distinctive features...",
      characterTheme: "What is this character's central theme or symbolic meaning in your story?",
      characterArc: "How does this character change and grow throughout the story?",
      motivations: "What drives this character? What do they want most?",
      conflicts: "What internal and external conflicts does this character face?",
      backstory: "What key events in this character's past shaped who they are?",
      symbolism: "What does this character represent in your story's themes?",
    };
    return prompts[field] || "Enter details...";
  };

  const getFieldTip = (field: string) => {
    const tips: Record<string, string> = {
      description: "💡 Tip: Include their personality traits, mannerisms, speech patterns, and role in your story",
      appearance: "💡 Tip: Focus on distinctive features that make them memorable - height, build, clothing style, unique marks",
      characterTheme: "💡 Tip: What lesson do they embody? Examples: redemption, courage, sacrifice, growth, betrayal",
      characterArc: "💡 Tip: Describe their journey from beginning to end - what do they learn or how do they transform?",
      motivations: "💡 Tip: Include both surface wants (goals) and deeper needs (what they truly require for fulfillment)",
      conflicts: "💡 Tip: Internal conflicts (fears, beliefs) and external conflicts (obstacles, antagonists)",
      backstory: "💡 Tip: Focus on 2-3 key events that shaped their worldview, fears, or driving motivations",
      symbolism: "💡 Tip: What do they represent in your themes? Hope, corruption, innocence, wisdom, change?",
    };
    return tips[field] || "";
  };

  const getFieldTitle = (field: string) => {
    const titles: Record<string, string> = {
      description: "Character Description",
      appearance: "Physical Appearance",
      characterTheme: "Character Theme",
      characterArc: "Character Arc",
      motivations: "Motivations",
      conflicts: "Conflicts",
      backstory: "Backstory",
      symbolism: "Symbolism",
    };
    return titles[field] || field;
  };

  const InteractiveField = ({ 
    field, 
    value, 
    icon: Icon, 
    title 
  }: { 
    field: string; 
    value: string; 
    icon: React.ComponentType<any>; 
    title: string;
  }) => (
    <div 
      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-3 rounded-lg transition-colors group"
      onClick={() => handleEdit(field, value)}
    >
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </Label>
        <Button 
          variant="ghost" 
          size="sm" 
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(field, value);
          }}
        >
          <Edit className="h-3 w-3" />
        </Button>
      </div>
      {value ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">{value}</p>
      ) : (
        <div className="text-sm">
          <div className="italic text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <Plus className="h-3 w-3" />
            Click to add {title.toLowerCase()}...
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {getFieldTip(field)}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Character Profile
              </div>
              <Badge variant="secondary">{character.role}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InteractiveField 
              field="description"
              value={character.description || ""}
              icon={User}
              title="Description"
            />
            <InteractiveField 
              field="appearance"
              value={character.appearance || ""}
              icon={User}
              title="Appearance"
            />
            <InteractiveField 
              field="characterTheme"
              value={character.characterTheme || ""}
              icon={Lightbulb}
              title="Character Theme"
            />
          </CardContent>
        </Card>

        {/* Character Arc */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Character Development
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InteractiveField 
              field="characterArc"
              value={character.characterArc || ""}
              icon={GitBranch}
              title="Character Arc"
            />
            <InteractiveField 
              field="motivations"
              value={character.motivations || ""}
              icon={Target}
              title="Motivations"
            />
            <InteractiveField 
              field="conflicts"
              value={character.conflicts || ""}
              icon={Sword}
              title="Conflicts"
            />
          </CardContent>
        </Card>

        {/* Background & Symbolism */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Background & Symbolism
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <InteractiveField 
              field="backstory"
              value={character.backstory || ""}
              icon={BookOpen}
              title="Backstory"
            />
            <InteractiveField 
              field="symbolism"
              value={character.symbolism || ""}
              icon={Zap}
              title="Symbolism"
            />
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {getFieldTitle(editField)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editValue">{getFieldTitle(editField)}</Label>
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                {getFieldTip(editField)}
              </div>
              {editField === "description" || editField === "backstory" || editField === "characterArc" ? (
                <Textarea
                  id="editValue"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={getFieldPrompt(editField)}
                  rows={4}
                />
              ) : (
                <Input
                  id="editValue"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={getFieldPrompt(editField)}
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                disabled={updateCharacterMutation.isPending}
                className="flex-1"
              >
                {updateCharacterMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}