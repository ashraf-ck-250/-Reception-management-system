import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus, Search, CheckCircle, XCircle, Shield, ShieldCheck, Trash2, Pencil, Eye } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "receptionist";
  status: "active" | "pending" | "rejected";
  joinedDate: string;
  avatarUrl?: string;
}

export default function UserManagement() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight") || "";
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "receptionist" as "admin" | "receptionist", password: "" });
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  /** e.g. `add`, `edit`, `approve:id`, `reject:id`, `delete:id` */
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const loadUsers = async () => {
    const response = await api.get("/users");
    setUsers(response.data);
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`user-row-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [highlightId, users]);

  const handleApprove = async (id: string) => {
    setBusyKey(`approve:${id}`);
    try {
      await api.patch(`/users/${id}/status`, { status: "active" });
      await loadUsers();
      toast.success("User approved successfully");
    } catch {
      toast.error("Could not approve user");
    } finally {
      setBusyKey(null);
    }
  };

  const handleReject = async (id: string) => {
    setBusyKey(`reject:${id}`);
    try {
      await api.patch(`/users/${id}/status`, { status: "rejected" });
      await loadUsers();
      toast.error("User rejected");
    } catch {
      toast.error("Could not update user");
    } finally {
      setBusyKey(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyKey(`delete:${id}`);
    try {
      await api.delete(`/users/${id}`);
      await loadUsers();
      toast.success("User removed");
    } catch {
      toast.error("Could not remove user");
    } finally {
      setBusyKey(null);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Please fill all fields");
      return;
    }
    setBusyKey("add");
    try {
      await api.post("/users", newUser);
      await loadUsers();
      setNewUser({ name: "", email: "", role: "receptionist", password: "" });
      setAddOpen(false);
      toast.success("User added successfully");
    } catch {
      toast.error("Could not add user");
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setBusyKey("edit");
    try {
      await api.put(`/users/${editingUser.id}`, editingUser);
      await loadUsers();
      setEditingUser(null);
      toast.success("User updated successfully");
    } catch {
      toast.error("Could not update user");
    } finally {
      setBusyKey(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/10 text-success border-0 hover:bg-success/20">Active</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning border-0 hover:bg-warning/20">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive border-0 hover:bg-destructive/20">Rejected</Badge>;
      default:
        return null;
    }
  };

  const pendingCount = users.filter((u) => u.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? "Manage staff accounts, approve or reject users" : "View staff directory"}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus size={16} />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Enter full name" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Enter email" type="email" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Enter password" type="password" />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={(v: "admin" | "receptionist") => setNewUser({ ...newUser, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)} disabled={busyKey === "add"}>
                  Cancel
                </Button>
                <Button onClick={() => void handleAddUser()} loading={busyKey === "add"}>
                  Add User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pending Approval Banner */}
      {isAdmin && pendingCount > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
              <Shield size={20} className="text-warning" />
            </div>
            <div>
              <p className="font-medium text-foreground">{pendingCount} user{pendingCount > 1 ? "s" : ""} awaiting approval</p>
              <p className="text-xs text-muted-foreground">Review and approve or reject pending registrations below</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Staff Members ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow
                    key={u.id}
                    id={`user-row-${u.id}`}
                    className={highlightId === u.id ? "bg-primary/5 ring-2 ring-inset ring-primary/40" : undefined}
                  >
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="w-7 h-7 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                            {u.name[0]}
                          </div>
                        )}
                        {u.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        {u.role === "admin" ? <ShieldCheck size={14} className="text-primary" /> : <Shield size={14} className="text-muted-foreground" />}
                        <span className="capitalize">{u.role}</span>
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(u.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.joinedDate}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-success hover:text-success hover:bg-success/10"
                                loading={busyKey === `approve:${u.id}`}
                                disabled={busyKey !== null && busyKey !== `approve:${u.id}`}
                                onClick={() => void handleApprove(u.id)}
                              >
                                <CheckCircle size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                loading={busyKey === `reject:${u.id}`}
                                disabled={busyKey !== null && busyKey !== `reject:${u.id}`}
                                onClick={() => void handleReject(u.id)}
                              >
                                <XCircle size={16} />
                              </Button>
                            </>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground">
                                <Eye size={16} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>User Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 text-sm">
                                <div className="flex items-center gap-3">
                                  {u.avatarUrl ? (
                                    <img src={u.avatarUrl} alt={u.name} className="w-12 h-12 rounded-full object-cover border border-border" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                      {u.name[0]}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium text-base">{u.name}</p>
                                    <p className="text-muted-foreground">{u.email}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-muted-foreground">Role</p>
                                    <p className="capitalize font-medium">{u.role}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Status</p>
                                    <p className="capitalize font-medium">{u.status}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Joined Date</p>
                                    <p className="font-medium">{u.joinedDate}</p>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Dialog open={editingUser?.id === u.id} onOpenChange={(open) => setEditingUser(open ? u : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => setEditingUser(u)}>
                                <Pencil size={16} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User</DialogTitle>
                              </DialogHeader>
                              {editingUser && (
                                <div className="space-y-4">
                                  <div>
                                    <Label>Full Name</Label>
                                    <Input value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                                  </div>
                                  <div>
                                    <Label>Email</Label>
                                    <Input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} />
                                  </div>
                                  <div>
                                    <Label>Role</Label>
                                    <Select value={editingUser.role} onValueChange={(v: "admin" | "receptionist") => setEditingUser({ ...editingUser, role: v })}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="receptionist">Receptionist</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <Select value={editingUser.status} onValueChange={(v: "active" | "pending" | "rejected") => setEditingUser({ ...editingUser, status: v })}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button onClick={() => void handleUpdateUser()} className="w-full" loading={busyKey === "edit"}>
                                    Save Changes
                                  </Button>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          {u.email !== user?.email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              loading={busyKey === `delete:${u.id}`}
                              disabled={busyKey !== null && busyKey !== `delete:${u.id}`}
                              onClick={() => void handleDelete(u.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
