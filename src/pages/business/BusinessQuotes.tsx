import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Eye, Inbox, FileText } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatMoney as formatPrice } from "@/lib/currency";
import { useI18n } from "@/lib/i18n/LocaleProvider";

type QuoteRequestRow = {
  id: string;
  created_at: string;
  company_name: string | null;
  contact_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  items: any;
  brand_user_id: string | null;
};

export default function BusinessQuotes() {
  const { t, language } = useI18n();
  usePageMeta({ title: "Tekliflerim", description: "Müşterilerden gelen teklif talepleri", noIndex: true });

  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["business", "quotes", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .eq("brand_user_id", userId)
        .order("created_at", { ascending: false });
      
      // Geçici çözüm: Henüz migration çalıştırılmadıysa hata fırlatabilir
      if (error && error.message.includes("brand_user_id")) {
         console.warn("brand_user_id sütunu bulunamadı. Lütfen Supabase migration'ı çalıştırın.");
         return [];
      }
      if (error) throw error;
      return (data ?? []) as QuoteRequestRow[];
    },
    enabled: Boolean(userId),
  });

  const [selectedQuote, setSelectedQuote] = useState<QuoteRequestRow | null>(null);

  if (!userId) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Oturum gerekli.</CardContent>
        </Card>
      </div>
    );
  }

  const locale = language === "tr" ? tr : undefined;

  return (
    <div className="p-4 pt-6 md:p-6 md:pt-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Teklif Talepleri</h1>
          <p className="text-muted-foreground mt-1">Müşterilerinizin oluşturduğu sepetler ve tasarım detayları.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">Yükleniyor...</div>
          ) : quotes && quotes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>İletişim</TableHead>
                  <TableHead className="text-right">Detaylar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(quote.created_at), "dd MMM yyyy HH:mm", { locale })}
                    </TableCell>
                    <TableCell className="font-medium">{quote.contact_name || "Bilinmiyor"}</TableCell>
                    <TableCell>{quote.company_name || "—"}</TableCell>
                    <TableCell>
                      <div className="text-sm">{quote.email}</div>
                      <div className="text-xs text-muted-foreground">{quote.phone}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedQuote(quote)}>
                        <Eye className="w-4 h-4 mr-2" />
                        İncele
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">Henüz teklif talebi yok</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Katalogunuzdan teklif talebi oluşturulduğunda burada listelenecektir.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedQuote} onOpenChange={(val) => !val && setSelectedQuote(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b shrink-0 bg-muted/30">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-5 h-5 text-primary" />
              Teklif Detayları
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            {selectedQuote && (
              <div className="p-6 space-y-8">
                {/* Müşteri Bilgileri */}
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    İletişim Bilgileri
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border">
                    <div>
                      <span className="block text-xs text-muted-foreground">Firma</span>
                      <span className="font-medium">{selectedQuote.company_name || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground">İletişim Kişisi</span>
                      <span className="font-medium">{selectedQuote.contact_name || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground">E-posta</span>
                      <span className="font-medium">{selectedQuote.email}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground">Telefon</span>
                      <span className="font-medium">{selectedQuote.phone || "—"}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="block text-xs text-muted-foreground">Adres</span>
                      <span className="font-medium">{selectedQuote.address || "—"}</span>
                    </div>
                    {selectedQuote.notes && (
                      <div className="md:col-span-2 mt-2 pt-2 border-t">
                        <span className="block text-xs text-muted-foreground">Müşteri Notu</span>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{selectedQuote.notes}</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Ürünler */}
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Talep Edilen Ürünler
                  </h3>
                  <div className="space-y-4">
                    {Array.isArray(selectedQuote.items) &&
                      selectedQuote.items.map((item: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-4 bg-card shadow-sm flex flex-col lg:flex-row gap-6">
                          
                          {/* Mockup Görselleri */}
                          {item.mockupUrls && Object.keys(item.mockupUrls).length > 0 ? (
                            <div className="flex gap-2 shrink-0 overflow-x-auto pb-2">
                              {Object.entries(item.mockupUrls).map(([vid, url]) => (
                                <div key={vid} className="w-32 h-32 shrink-0 border rounded-md overflow-hidden bg-muted/30">
                                  <img src={url as string} alt="Mockup" className="w-full h-full object-contain" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="w-32 h-32 shrink-0 border rounded-md bg-muted/30 flex flex-col items-center justify-center text-xs text-muted-foreground text-center p-2">
                              Görsel Yok
                            </div>
                          )}

                          <div className="flex-1 space-y-3">
                            <div>
                              <h4 className="font-bold text-lg">{item.name}</h4>
                              {item.product_code && (
                                <p className="text-xs text-muted-foreground">Kod: {item.product_code}</p>
                              )}
                              {item.hasDesign && (
                                <p className="text-xs text-primary font-medium mt-1">
                                  Özel Tasarım İçeriyor {item.designName ? `(${item.designName})` : ""}
                                </p>
                              )}
                            </div>

                            <dl className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4 text-sm">
                              <div>
                                <dt className="text-muted-foreground text-xs">Renk</dt>
                                <dd className="font-medium">{item.selectedColorName || "—"}</dd>
                              </div>
                              <div>
                                <dt className="text-muted-foreground text-xs">Beden</dt>
                                <dd className="font-medium">{item.selectedSize || "—"}</dd>
                              </div>
                              <div>
                                <dt className="text-muted-foreground text-xs">Teknik</dt>
                                <dd className="font-medium">{item.selectedTechnique || "—"}</dd>
                              </div>
                              <div>
                                <dt className="text-muted-foreground text-xs">Baskı Alanı</dt>
                                <dd className="font-medium">
                                  {Array.isArray(item.selectedPlacements) 
                                    ? item.selectedPlacements.map((p: any) => p.name).join(", ") 
                                    : "—"}
                                </dd>
                              </div>
                              <div className="col-span-2">
                                <dt className="text-muted-foreground text-xs">Adet (Beden Dağılımı)</dt>
                                <dd className="font-medium">
                                  {item.quantityBySize ? (
                                    <span>
                                      {Object.entries(item.quantityBySize)
                                        .map(([s, q]) => `${s}: ${q}`)
                                        .join(", ")}
                                      <span className="ml-2 text-muted-foreground">(Toplam {item.quantity})</span>
                                    </span>
                                  ) : (
                                    item.quantity
                                  )}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-muted-foreground text-xs">Birim Fiyat</dt>
                                <dd className="font-medium">{formatPrice(item.unitPrice, item.currency)}</dd>
                              </div>
                              <div>
                                <dt className="text-muted-foreground text-xs">Satır Toplamı</dt>
                                <dd className="font-semibold text-foreground">{formatPrice(item.lineTotal, item.currency)}</dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {/* Genel Toplam */}
                  <div className="mt-6 flex justify-end p-4 bg-muted/20 rounded-lg border">
                    <p className="text-lg">
                      <span className="text-muted-foreground mr-3">Genel Toplam:</span>
                      <span className="font-bold text-foreground">
                        {selectedQuote && Array.isArray(selectedQuote.items) && selectedQuote.items.length > 0 
                          ? formatPrice(
                              selectedQuote.items.reduce((s: number, i: any) => s + (i.lineTotal || 0), 0),
                              selectedQuote.items[0]?.currency
                            )
                          : "0"}
                      </span>
                    </p>
                  </div>
                </section>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
