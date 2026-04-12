"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { User, Lock, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Required"),
  newPassword: z.string().min(6, "Min 6 characters"),
  confirmPassword: z.string().min(6, "Required"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user as { id?: string; name?: string; email?: string; role?: string } | undefined;

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: profileErrors } } =
    useForm<ProfileForm>({
      resolver: zodResolver(profileSchema),
      defaultValues: { name: user?.name || "", phone: "" },
    });

  const { register: regPwd, handleSubmit: handlePwd, reset: resetPwd, formState: { errors: pwdErrors } } =
    useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSaveProfile = async (data: ProfileForm) => {
    if (!user?.id) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, phone: data.phone || null }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const onSavePassword = async (data: PasswordForm) => {
    if (!user?.id) return;
    setSavingPassword(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.newPassword }),
      });
      if (!res.ok) throw new Error("Failed to update password");
      toast.success("Password updated!");
      resetPwd();
    } catch {
      toast.error("Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  const roleColors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700",
    MANAGER: "bg-blue-100 text-blue-700",
    CASHIER: "bg-green-100 text-green-700",
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Profile</h1>
        <p className="text-slate-500 text-sm">Manage your account settings</p>
      </div>

      {/* User Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{user?.name}</h2>
                <p className="text-slate-500 text-sm">{user?.email}</p>
                <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColors[user?.role || ""] || "bg-gray-100 text-gray-600"}`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-500" />
              Edit Profile
            </CardTitle>
            <CardDescription>Update your name and contact information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfile(onSaveProfile)} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input className="mt-1" {...regProfile("name")} />
                {profileErrors.name && <p className="text-red-500 text-xs mt-1">{profileErrors.name.message}</p>}
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ""} readOnly className="mt-1 bg-slate-50 text-slate-500" />
                <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <Label>Phone (for WhatsApp notifications)</Label>
                <Input placeholder="+1234567890" className="mt-1" {...regProfile("phone")} />
              </div>
              <Button type="submit" loading={savingProfile} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Change Password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-500" />
              Change Password
            </CardTitle>
            <CardDescription>Keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePwd(onSavePassword)} className="space-y-4">
              <div>
                <Label>Current Password</Label>
                <Input type="password" className="mt-1" {...regPwd("currentPassword")} />
                {pwdErrors.currentPassword && <p className="text-red-500 text-xs mt-1">{pwdErrors.currentPassword.message}</p>}
              </div>
              <div>
                <Label>New Password</Label>
                <Input type="password" className="mt-1" {...regPwd("newPassword")} />
                {pwdErrors.newPassword && <p className="text-red-500 text-xs mt-1">{pwdErrors.newPassword.message}</p>}
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input type="password" className="mt-1" {...regPwd("confirmPassword")} />
                {pwdErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{pwdErrors.confirmPassword.message}</p>}
              </div>
              <Button type="submit" loading={savingPassword} variant="outline">
                <Lock className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
