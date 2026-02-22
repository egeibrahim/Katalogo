import { useState, useEffect, useRef, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Upload, Trash2, Folder, FolderPlus, MoreHorizontal, FolderInput } from "lucide-react";
import { SignedImage } from "@/components/ui/signed-image";
import { sanitizeStorageFileName } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { DesignTemplate, ReadyMadeFolder } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DESIGN_TEMPLATES_BUCKET = "design-templates";
const DEFAULT_FOLDER_NAME = "Galeri";

interface ImageGalleryProps {
  onImageSelect: (imageUrl: string) => void;
  canManage?: boolean;
}

export function ImageGallery({ onImageSelect, canManage = false }: ImageGalleryProps) {
  const [folders, setFolders] = useState<ReadyMadeFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [templateToDeleteId, setTemplateToDeleteId] = useState<string | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [folderToDeleteId, setFolderToDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultFolderId = useMemo(
    () => folders.find((f) => f.name === DEFAULT_FOLDER_NAME)?.id ?? null,
    [folders],
  );

  const ensureDefaultFolder = async (): Promise<string | null> => {
    const { data: existing } = await supabase
      .from("ready_made_folders")
      .select("id")
      .eq("name", DEFAULT_FOLDER_NAME)
      .maybeSingle();
    if (existing?.id) return existing.id;

    const { data: inserted, error } = await supabase
      .from("ready_made_folders")
      .insert({ name: DEFAULT_FOLDER_NAME, sort_order: 0 })
      .select("id")
      .single();
    if (error || !inserted?.id) return null;
    return inserted.id;
  };

  const fetchFolders = async () => {
    const { data, error } = await supabase
      .from("ready_made_folders")
      .select("*")
      .order("sort_order")
      .order("name");
    if (!error) setFolders(data ?? []);
  };

  const fetchTemplates = async () => {
    const folderId = currentFolderId ?? defaultFolderId;
    let query = supabase
      .from("design_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (folderId) query = query.eq("folder_id", folderId);
    else query = query.is("folder_id", null);

    const { data, error } = await query;
    if (!error) setTemplates(data ?? []);
  };

  useEffect(() => {
    void (async () => {
      if (canManage) await ensureDefaultFolder();
      await fetchFolders();
    })();
  }, [canManage]);

  useEffect(() => {
    fetchTemplates();
  }, [currentFolderId, defaultFolderId]);

  const foldersSorted = useMemo(
    () =>
      [...folders].sort((a, b) => {
        if (a.name === DEFAULT_FOLDER_NAME) return -1;
        if (b.name === DEFAULT_FOLDER_NAME) return 1;
        return a.name.localeCompare(b.name);
      }),
    [folders],
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Lütfen bir görsel dosyası seçin.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Giriş yapın.");
      return;
    }

    let targetFolderId = currentFolderId ?? defaultFolderId;
    if (!targetFolderId) {
      const { data: defaultRow } = await supabase
        .from("ready_made_folders")
        .select("id")
        .eq("name", DEFAULT_FOLDER_NAME)
        .maybeSingle();
      targetFolderId = defaultRow?.id ?? (await ensureDefaultFolder()) ?? null;
    }
    if (!targetFolderId) {
      toast.error(
        canManage
          ? "Klasör bulunamadı. Sayfayı yenileyin veya veritabanı migration'larını kontrol edin."
          : "Klasör bulunamadı. Yalnızca yönetici tasarım yükleyebilir.",
      );
      return;
    }

    setIsUploading(true);
    const safeName = sanitizeStorageFileName(file.name);
    const ext = safeName.includes(".") ? safeName.split(".").pop() : "png";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(DESIGN_TEMPLATES_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      toast.error("Yükleme başarısız: " + uploadError.message);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const { data: urlData } = supabase.storage.from(DESIGN_TEMPLATES_BUCKET).getPublicUrl(path);
    const imageUrl = urlData?.publicUrl ?? "";
    const name = file.name.replace(/\.[^.]+$/, "") || "Tasarım";

    const { error: insertError } = await supabase.from("design_templates").insert({
      name,
      image_url: imageUrl,
      is_active: true,
      folder_id: targetFolderId,
    });

    if (insertError) {
      toast.error("Kayıt eklenemedi: " + insertError.message);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    toast.success("Tasarım eklendi.");
    await Promise.all([fetchFolders(), fetchTemplates()]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("design_templates").delete().eq("id", id);
    if (error) {
      toast.error("Silinemedi: " + error.message);
      return;
    }
    toast.success("Tasarım silindi.");
    setTemplateToDeleteId(null);
    await fetchTemplates();
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    const { error } = await supabase
      .from("ready_made_folders")
      .insert({ name: newFolderName.trim(), sort_order: folders.length });
    if (error) {
      toast.error("Klasör oluşturulamadı: " + (error.message || "Yetki veya veritabanı hatası."));
      return;
    }
    toast.success("Klasör oluşturuldu.");
    setShowNewFolderDialog(false);
    setNewFolderName("");
    await fetchFolders();
  };

  const saveRenameFolder = async () => {
    if (!editingFolderId) return;
    if (!editingFolderName.trim()) return;
    const { error } = await supabase
      .from("ready_made_folders")
      .update({ name: editingFolderName.trim() })
      .eq("id", editingFolderId);
    if (error) {
      toast.error("Klasör adı güncellenemedi.");
      return;
    }
    toast.success("Klasör güncellendi.");
    setEditingFolderId(null);
    setEditingFolderName("");
    await fetchFolders();
  };

  const deleteFolder = async (id: string) => {
    const { error } = await supabase.from("ready_made_folders").delete().eq("id", id);
    if (error) {
      toast.error("Klasör silinemedi.");
      return;
    }
    toast.success("Klasör silindi.");
    if (currentFolderId === id) setCurrentFolderId(null);
    setFolderToDeleteId(null);
    await fetchFolders();
    await fetchTemplates();
  };

  const moveTemplateToFolder = async (templateId: string, folderId: string) => {
    const { error } = await supabase
      .from("design_templates")
      .update({ folder_id: folderId })
      .eq("id", templateId);
    if (error) {
      toast.error("Taşınamadı.");
      return;
    }
    toast.success("Taşındı.");
    await fetchTemplates();
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const currentFolderName =
    currentFolderId && currentFolderId !== defaultFolderId
      ? folders.find((f) => f.id === currentFolderId)?.name ?? "Klasör"
      : DEFAULT_FOLDER_NAME;

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pt-2">
        <h3 className="text-sm font-semibold px-1">Galeri</h3>
        <p className="text-xs text-muted-foreground mt-0.5 px-1">
          {canManage
            ? "Klasörlerle düzenleyin; kullanıcılar tasarımları kullanabilir."
            : "Kullanılabilir hazır tasarımlar."}
        </p>
        {canManage && (
          <Button
            type="button"
            onClick={triggerUpload}
            disabled={isUploading}
            className="w-full mt-2 h-10 rounded-full bg-foreground text-background hover:bg-foreground/90"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Yükleniyor…" : "Tasarım yükle"}
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
        disabled={isUploading}
      />

      <div className="flex-1 mt-3 flex flex-col min-h-0">
        {/* Klasörler */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 px-1">
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowNewFolderDialog(true)}
                aria-label="Klasör oluştur"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="rounded-lg border border-border bg-background">
            <ScrollArea className="max-h-24">
              <div className="p-1.5 space-y-1">
                {foldersSorted.map((folder) => {
                  const isEditing = editingFolderId === folder.id;
                  const isActive =
                    currentFolderId === folder.id ||
                    (currentFolderId === null && folder.id === defaultFolderId);
                  const isDefault = folder.name === DEFAULT_FOLDER_NAME;
                  return (
                    <div
                      key={folder.id}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2 py-1.5",
                        isActive && "bg-muted",
                      )}
                    >
                      <button
                        className="flex-1 flex items-center gap-1.5 text-left min-w-0"
                        onClick={() => setCurrentFolderId(isActive ? null : folder.id)}
                        type="button"
                      >
                        <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium truncate">
                          {folder.name}
                          {isDefault && (
                            <span className="ml-1 text-muted-foreground font-normal">(sabit)</span>
                          )}
                        </span>
                      </button>
                      {canManage && !isDefault && !isEditing && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingFolderId(folder.id);
                                setEditingFolderName(folder.name);
                              }}
                            >
                              Yeniden adlandır
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setFolderToDeleteId(folder.id)}
                            >
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
                {folders.length === 0 && (
                  <div className="px-1 py-0.5 text-xs text-muted-foreground">Henüz klasör yok.</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Tasarımlar grid */}
        <div className="space-y-2 mt-2 flex-1 min-h-0 flex flex-col">
          <div className="px-1">
            <div className="text-sm font-semibold">{currentFolderName}</div>
          </div>
          {templates.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="text-sm font-medium">
                {currentFolderId ? "Bu klasörde tasarım yok." : "Henüz tasarım yok."}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {canManage ? "Tasarım yüklemek için yukarıdaki butonu kullanın." : "Daha sonra tekrar bakın."}
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 gap-2 px-1 pb-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted/30 hover:border-primary transition-all"
                  >
                    <button
                      type="button"
                      className="absolute inset-0 w-full h-full flex items-center justify-center"
                      onClick={() => onImageSelect(template.image_url)}
                    >
                      <SignedImage
                        src={template.thumbnail_url || template.image_url}
                        alt={template.name}
                        className="w-full h-full object-contain hover:scale-105 transition-transform"
                      />
                    </button>
                    {canManage && (
                      <div className="absolute top-1 left-1 right-1 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7 rounded-full shadow-md bg-background/90 hover:bg-background"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Klasöre taşı"
                            >
                              <FolderInput className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                            {folders.map((folder) => (
                              <DropdownMenuItem
                                key={folder.id}
                                onClick={() => moveTemplateToFolder(template.id, folder.id)}
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
                            setTemplateToDeleteId(template.id);
                          }}
                          aria-label="Tasarımı sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Yeni klasör */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni klasör</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Klasör adı"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              İptal
            </Button>
            <Button onClick={createFolder}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Klasör adı düzenle */}
      <Dialog
        open={!!editingFolderId}
        onOpenChange={(open) => !open && setEditingFolderId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klasörü yeniden adlandır</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Klasör adı"
            value={editingFolderName}
            onChange={(e) => setEditingFolderName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFolderId(null)}>
              İptal
            </Button>
            <Button onClick={saveRenameFolder}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tasarım sil onay */}
      <AlertDialog
        open={!!templateToDeleteId}
        onOpenChange={(open) => !open && setTemplateToDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tasarımı sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu tasarım kalıcı olarak silinecek. Kullanıcılar artık göremeyecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => templateToDeleteId && deleteTemplate(templateToDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Klasör sil onay */}
      <AlertDialog
        open={!!folderToDeleteId}
        onOpenChange={(open) => !open && setFolderToDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Klasörü sil</AlertDialogTitle>
            <AlertDialogDescription>
              Klasör silinecek. İçindeki tasarımlar klasörsüz kalacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => folderToDeleteId && deleteFolder(folderToDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
