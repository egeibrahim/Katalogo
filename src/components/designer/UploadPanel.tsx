import { useMemo, useRef, useEffect, useState } from "react";
import {
  Clock,
  Folder,
  FolderInput,
  MoreHorizontal,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { sanitizeStorageFileName } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/ui/signed-image";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { UserFolder, UserUpload } from "./types";

interface UploadPanelProps {
  onImageSelect: (imageUrl: string) => void;
  /** Baskı alanı oluşturulup kaydedilmeden görsel yüklemesini engelle */
  disabled?: boolean;
}

export function UploadPanel({ onImageSelect, disabled }: UploadPanelProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");

  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [folderUploads, setFolderUploads] = useState<UserUpload[]>([]);
  const [allUploads, setAllUploads] = useState<UserUpload[]>([]);

  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [folderToDeleteId, setFolderToDeleteId] = useState<string | null>(null);
  const [uploadToDeleteId, setUploadToDeleteId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "name">("newest");


  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MY_DESIGNS_FOLDER_NAME = "My Designs";

  const myDesignsFolderId = useMemo(
    () => folders.find((f) => f.name === MY_DESIGNS_FOLDER_NAME)?.id ?? null,
    [folders],
  );

  const normalize = (s: string) => s.trim().toLowerCase();

  const filteredSortedAllUploads = useMemo(() => {
    const q = normalize(searchQuery);
    const filtered = q
      ? allUploads.filter((u) => normalize(u.file_name).includes(q))
      : allUploads;

    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "name") return a.file_name.localeCompare(b.file_name);
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return sortMode === "newest" ? bt - at : at - bt;
    });

    return sorted;
  }, [allUploads, searchQuery, sortMode]);

  const filteredSortedFolderUploads = useMemo(() => {
    const q = normalize(searchQuery);
    const filtered = q
      ? folderUploads.filter((u) => normalize(u.file_name).includes(q))
      : folderUploads;

    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "name") return a.file_name.localeCompare(b.file_name);
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return sortMode === "newest" ? bt - at : at - bt;
    });

    return sorted;
  }, [folderUploads, searchQuery, sortMode]);

  const folderImagesPreview = useMemo(
    () => filteredSortedFolderUploads.slice(0, 9),
    [filteredSortedFolderUploads],
  );
  const allImagesPreview = useMemo(() => filteredSortedAllUploads.slice(0, 9), [filteredSortedAllUploads]);

  const gridUploads = filteredSortedFolderUploads;

  /** Yükle sekmesinde sadece tek sabit klasör (My Designs) gösterilir */
  const foldersSorted = useMemo(
    () => folders.filter((f) => f.id === myDesignsFolderId),
    [folders, myDesignsFolderId],
  );

  useEffect(() => {
    void fetchAllUploads();
  }, []);

  const ensureMyDesignsFolder = async (): Promise<string | null> => {
    const user = await getAuthedUser();
    if (!user) return null;

    const { data: existing } = await supabase
      .from("user_folders")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", MY_DESIGNS_FOLDER_NAME)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data: inserted, error } = await supabase
      .from("user_folders")
      .insert({
        user_id: user.id,
        name: MY_DESIGNS_FOLDER_NAME,
        parent_folder_id: null,
      })
      .select("id")
      .single();

    if (error || !inserted?.id) return null;

    await supabase
      .from("user_uploads")
      .update({ folder_id: inserted.id })
      .eq("user_id", user.id)
      .is("folder_id", null);

    return inserted.id;
  };

  useEffect(() => {
    void (async () => {
      await ensureMyDesignsFolder();
      await fetchFolders();
    })();
  }, []);

  useEffect(() => {
    void fetchFolders();
  }, [currentFolderId]);

  useEffect(() => {
    void fetchFolderUploads();
  }, [currentFolderId, myDesignsFolderId]);

  const getAuthedUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  };

  const fetchFolders = async () => {
    const user = await getAuthedUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_folders")
      .select("*")
      .eq("user_id", user.id)
      .is("parent_folder_id", null)
      .order("name");

    if (error) return;
    setFolders(data ?? []);
  };

  const fetchFolderUploads = async () => {
    const user = await getAuthedUser();
    if (!user) return;

    const folderId = currentFolderId ?? myDesignsFolderId;
    const query = supabase
      .from("user_uploads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (folderId) {
      query.eq("folder_id", folderId);
    } else {
      query.is("folder_id", null);
    }

    const { data, error } = await query;
    if (error) return;
    setFolderUploads(data ?? []);
  };

  const fetchAllUploads = async () => {
    const user = await getAuthedUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_uploads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return;
    setAllUploads(data ?? []);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const user = await getAuthedUser();
    if (!user) {
      toast.error("Please log in");
      return;
    }

    const targetFolderId = currentFolderId ?? (myDesignsFolderId ?? (await ensureMyDesignsFolder()));
    if (!targetFolderId) {
      toast.error("Folder not found");
      return;
    }

    setIsLoading(true);

    for (const file of Array.from(files)) {
      if (file.type !== "image/png") {
        toast.error(`${file.name}: Only PNG format is supported`);
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name}: File size must be at most 50MB`);
        continue;
      }

      const safeName = sanitizeStorageFileName(file.name);
      const fileExt = safeName.includes(".") ? safeName.split(".").pop() : "png";
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user-uploads")
        .upload(fileName, file);

      if (uploadError) {
        toast.error(`${file.name} could not be uploaded`);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("user-uploads").getPublicUrl(fileName);

      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const { error: dbError } = await supabase.from("user_uploads").insert({
        user_id: user.id,
        folder_id: targetFolderId,
        file_name: file.name,
        original_url: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        width: img.width,
        height: img.height,
      });

      if (!dbError) toast.success(`${file.name} uploaded`);
    }

    setIsLoading(false);
    await Promise.all([fetchFolders(), fetchFolderUploads(), fetchAllUploads()]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    const user = await getAuthedUser();
    if (!user) {
      toast.error("Please log in");
      return;
    }

    const { error } = await supabase.from("user_folders").insert({
      user_id: user.id,
      name: newFolderName.trim(),
      parent_folder_id: null,
    });

    if (error) {
      toast.error("Could not create folder");
      return;
    }

    toast.success("Folder created");
    setShowNewFolderDialog(false);
    setNewFolderName("");
    await fetchFolders();
  };

  const startRenameFolder = (folder: UserFolder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const saveRenameFolder = async () => {
    if (!editingFolderId) return;
    if (!editingFolderName.trim()) return;

    const user = await getAuthedUser();
    if (!user) {
      toast.error("Please log in");
      return;
    }

    const { error } = await supabase
      .from("user_folders")
      .update({ name: editingFolderName.trim() })
      .eq("id", editingFolderId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Could not update folder name");
      return;
    }

    toast.success("Folder updated");
    setEditingFolderId(null);
    setEditingFolderName("");
    await fetchFolders();
  };

  const deleteFolder = async (folderId: string) => {
    const user = await getAuthedUser();
    if (!user) {
      toast.error("Please log in");
      return;
    }

    const { error } = await supabase
      .from("user_folders")
      .delete()
      .eq("id", folderId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Could not delete folder");
      return;
    }

    toast.success("Folder deleted");
    if (currentFolderId === folderId) setCurrentFolderId(null);
    await Promise.all([fetchFolders(), fetchFolderUploads(), fetchAllUploads()]);
  };

  const deleteUpload = async (uploadId: string) => {
    const user = await getAuthedUser();
    if (!user) {
      toast.error("Please log in");
      return;
    }

    const { error } = await supabase
      .from("user_uploads")
      .delete()
      .eq("id", uploadId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Could not delete image");
      return;
    }

    toast.success("Image deleted");
    setUploadToDeleteId(null);
    await Promise.all([fetchAllUploads(), fetchFolderUploads()]);
  };

  const moveUploadToFolder = async (uploadId: string, folderId: string | null) => {
    const user = await getAuthedUser();
    if (!user) {
      toast.error("Please log in");
      return;
    }

    const { error } = await supabase
      .from("user_uploads")
      .update({ folder_id: folderId })
      .eq("id", uploadId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Could not move");
      return;
    }

    toast.success("Moved to folder");
    await Promise.all([fetchAllUploads(), fetchFolderUploads()]);
  };

  const triggerUpload = () => fileInputRef.current?.click();

  return (
    <div className="flex flex-col h-full">
      {/* Tapstitch-style Upload pill (always visible) */}
      <div className="px-1 pt-2">
        <Button
          type="button"
          onClick={triggerUpload}
          disabled={isLoading}
          className="w-full h-10 rounded-full bg-foreground text-background hover:bg-foreground/90"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isLoading ? "Loading…" : "Upload"}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <Tabs value="upload" className="mt-2">
        <TabsContent value="upload" className="flex-1 mt-3">
          <div className="space-y-3">
            {/* Tek sabit klasör: My Designs */}
            <div className="space-y-1">
              <div className="rounded-lg border border-border bg-background">
                <ScrollArea className="max-h-24">
                  <div className="p-1.5 space-y-1">
                    {foldersSorted.map((folder) => {
                      const isEditing = editingFolderId === folder.id;
                      const isActive = currentFolderId === folder.id || (currentFolderId === null && folder.id === myDesignsFolderId);
                      const isMyDesigns = folder.name === MY_DESIGNS_FOLDER_NAME;
                      return (
                        <div
                          key={folder.id}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md px-2 py-1.5",
                            isActive && "bg-muted"
                          )}
                        >
                          <button
                            className="flex-1 flex items-center gap-1.5 text-left min-w-0"
                            onClick={() => setCurrentFolderId(isActive ? null : folder.id)}
                            type="button"
                          >
                            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium truncate">{folder.name}</span>
                          </button>
                          {!isMyDesigns && !isEditing ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => startRenameFolder(folder)}>
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setFolderToDeleteId(folder.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      );
                    })}
                    {foldersSorted.length === 0 ? (
                      <div className="px-1 py-0.5 text-xs text-muted-foreground">No folders yet.</div>
                    ) : null}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* My designs (sabit) / Klasör görselleri */}
            <div className="space-y-2">
              <div className="px-1">
                <div className="text-sm font-semibold">
                  {currentFolderId && currentFolderId !== myDesignsFolderId
                  ? folders.find((f) => f.id === currentFolderId)?.name ?? "Folder"
                  : "My designs"}
                </div>
              </div>
              {gridUploads.length === 0 ? (
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="text-sm font-medium">
                    {currentFolderId ? "No images in this folder." : "No images yet"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentFolderId ? "Click the folder icon in My designs to move images." : "Upload your first PNG image."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 px-1">
                  {gridUploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/30 hover:border-primary transition-colors group"
                    >
                      <button
                        type="button"
                        className="absolute inset-0 flex items-center justify-center w-full h-full"
                        onClick={() => handleImageSelect(upload.original_url)}
                      >
                        <SignedImage
                          src={upload.compressed_url || upload.original_url}
                          alt={upload.file_name}
                          loading="lazy"
                          className="w-full h-full object-contain"
                        />
                      </button>
                      <div className="absolute top-1 left-1 right-1 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7 rounded-full shadow-md bg-background/90 hover:bg-background"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Move to folder"
                            >
                              <FolderInput className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                            {foldersSorted.map((folder) => (
                              <DropdownMenuItem
                                key={folder.id}
                                onClick={() => moveUploadToFolder(upload.id, folder.id)}
                              >
                                {folder.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 rounded-full shadow-md bg-background/90 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadToDeleteId(upload.id);
                          }}
                          aria-label="Delete image"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="flex-1 mt-4">
          <div className="space-y-2 px-1 pb-2">
            <div>
              <div className="text-sm font-medium">History</div>
              <div className="text-xs text-muted-foreground">All uploaded images</div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search images (filename)…"
                className="h-9"
              />
              <div className="w-44">
                <Select
                  value={sortMode}
                  onValueChange={(v: string) => setSortMode(v as "newest" | "oldest" | "name")}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {allUploads.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">No upload history</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a PNG, then you can select it again from here.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setActiveTab("upload");
                      triggerUpload();
                    }}
                  >
                    Upload now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : filteredSortedAllUploads.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">No matches</div>
                    <p className="text-xs text-muted-foreground mt-1">No image matched your search.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSearchQuery("")}> 
                    Clear search
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[420px]">
              <div className="grid grid-cols-3 gap-2 pr-2">
                {filteredSortedAllUploads.map((upload) => (
                  <button
                    key={upload.id}
                    className="aspect-square rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
                    onClick={() => handleImageSelect(upload.original_url)}
                    title={upload.file_name}
                  >
                    <img
                      src={upload.compressed_url || upload.original_url}
                      alt={upload.file_name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirm */}
      <AlertDialog open={!!folderToDeleteId} onOpenChange={(open: boolean) => !open && setFolderToDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This folder will be deleted. Subfolders will also be deleted; images in the folder will remain without a folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!folderToDeleteId) return;
                void deleteFolder(folderToDeleteId);
                setFolderToDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Upload Confirm */}
      <AlertDialog open={!!uploadToDeleteId} onOpenChange={(open: boolean) => !open && setUploadToDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image</AlertDialogTitle>
            <AlertDialogDescription>
              This image will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!uploadToDeleteId) return;
                void deleteUpload(uploadToDeleteId);
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
