"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Send, Mail, MessageCircle, AlertTriangle, BarChart3, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";

interface Notification {
  id: string;
  type: "LOW_STOCK" | "DAILY_SUMMARY" | "SYSTEM";
  title: string;
  message: string;
  isRead: boolean;
  sentEmail: boolean;
  sentWhatsApp: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState("");
  const [sendPhone, setSendPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sendType, setSendType] = useState<"low_stock" | "daily_summary" | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setNotifications(data.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success("All notifications marked as read");
  };

  const handleSendNotification = async (action: string) => {
    setSending(true);
    setSendType(action === "send_low_stock_alert" ? "low_stock" : "daily_summary");
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email: sendEmail || undefined, phone: sendPhone || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || "Notification sent!");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setSending(false);
      setSendType(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const typeIcon = (type: string) => {
    switch (type) {
      case "LOW_STOCK": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "DAILY_SUMMARY": return <BarChart3 className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
        <p className="text-slate-500 text-sm">Manage alerts and notification settings</p>
      </div>

      {/* Send Notifications Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-indigo-500" />
              Send Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email Address
              </Label>
              <Input
                type="email"
                placeholder="manager@store.com"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Number
              </Label>
              <Input
                type="tel"
                placeholder="+1234567890"
                value={sendPhone}
                onChange={(e) => setSendPhone(e.target.value)}
                className="mt-1 h-9"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50"
                onClick={() => handleSendNotification("send_low_stock_alert")}
                loading={sending && sendType === "low_stock"}
                disabled={sending}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Low Stock Alert
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => handleSendNotification("send_daily_summary")}
                loading={sending && sendType === "daily_summary"}
                disabled={sending}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Daily Summary
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-500" />
              Notification Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total", value: notifications.length, color: "text-slate-700 bg-slate-50" },
                { label: "Unread", value: unreadCount, color: "text-red-600 bg-red-50" },
                { label: "Sent via Email", value: notifications.filter(n => n.sentEmail).length, color: "text-blue-600 bg-blue-50" },
                { label: "Sent via WhatsApp", value: notifications.filter(n => n.sentWhatsApp).length, color: "text-green-600 bg-green-50" },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-xl p-3 ${stat.color.split(" ")[1]}`}>
                  <p className={`text-2xl font-bold ${stat.color.split(" ")[0]}`}>{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-slate-500" />
            <span className="font-semibold text-slate-700">Activity Log</span>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="divide-y max-h-[500px] overflow-y-auto">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
              </div>
            ))
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Bell className="h-12 w-12 mb-3" />
              <p className="font-medium">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notif, i) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className={`px-5 py-4 flex items-start gap-3 transition-colors ${!notif.isRead ? "bg-blue-50/50" : "hover:bg-slate-50"}`}
              >
                <div className="mt-0.5 shrink-0">{typeIcon(notif.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${!notif.isRead ? "text-slate-900" : "text-slate-600"}`}>
                      {notif.title}
                    </p>
                    <span className="text-xs text-slate-400 shrink-0">{formatDateTime(notif.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                  <div className="flex gap-2 mt-1.5">
                    {notif.sentEmail && (
                      <Badge variant="info" className="text-xs py-0 px-1.5">
                        <Mail className="h-2.5 w-2.5 mr-1" /> Email
                      </Badge>
                    )}
                    {notif.sentWhatsApp && (
                      <Badge variant="success" className="text-xs py-0 px-1.5">
                        <MessageCircle className="h-2.5 w-2.5 mr-1" /> WhatsApp
                      </Badge>
                    )}
                  </div>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
