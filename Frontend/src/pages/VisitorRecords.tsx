import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Filter, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type RecordType = "attendance" | "service";

const MOCK_ATTENDANCE = [
  { id: 1, date: "2026-03-26", name: "Jean Baptiste", position: "Director", institution: "MINIJUST", contactType: "Phone", contact: "+250 788 123 456", email: "jean@minijust.gov.rw", time: "09:15 AM" },
  { id: 2, date: "2026-03-26", name: "Alice Uwimana", position: "Secretary", institution: "MININFRA", contactType: "Phone", contact: "+250 788 654 321", email: "alice@mininfra.gov.rw", time: "09:42 AM" },
  { id: 3, date: "2026-03-25", name: "Patrick Habimana", position: "Legal Advisor", institution: "Rwanda Law Reform", contactType: "Passport", contact: "RW123456", email: "patrick@rlrc.gov.rw", time: "10:05 AM" },
  { id: 4, date: "2026-03-25", name: "Grace Mukamana", position: "Analyst", institution: "PM Head Office", contactType: "Phone", contact: "+250 788 999 888", email: "grace@pm.gov.rw", time: "10:30 AM" },
  { id: 5, date: "2026-03-24", name: "Emmanuel Niyonzima", position: "Engineer", institution: "MININFRA", contactType: "Phone", contact: "+250 788 111 222", email: "emmanuel@mininfra.gov.rw", time: "08:45 AM" },
];

const MOCK_SERVICES = [
  { id: 1, date: "2026-03-26", name: "Diane Ishimwe", phone: "+250 788 333 444", passport: "RW789012", email: "diane@email.com", service: "MINIJUST", eventDate: "2026-04-01", message: "Request for legal consultation", status: "Completed" },
  { id: 2, date: "2026-03-26", name: "Claude Mugisha", phone: "+250 788 555 666", passport: "-", email: "claude@email.com", service: "Rwanda Law Reform Commission", eventDate: "2026-04-05", message: "Document certification needed", status: "Pending" },
  { id: 3, date: "2026-03-25", name: "Marie Claire", phone: "+250 788 777 888", passport: "RW345678", email: "marie@email.com", service: "MININFRA", eventDate: "2026-04-10", message: "Infrastructure project inquiry", status: "Pending" },
  { id: 4, date: "2026-03-24", name: "David Kamanzi", phone: "+250 788 000 111", passport: "-", email: "david@email.com", service: "PM Head Office", eventDate: "2026-03-30", message: "Official appointment request", status: "Completed" },
];

export default function VisitorRecords() {
  const [recordType, setRecordType] = useState<RecordType>("attendance");
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const filteredAttendance = MOCK_ATTENDANCE.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.institution.toLowerCase().includes(search.toLowerCase())
  );

  const filteredServices = MOCK_SERVICES.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.service.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Visitor Records</h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage all submitted records</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={recordType} onValueChange={(v: RecordType) => setRecordType(v)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter size={16} className="mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="attendance">Visitor Attendance</SelectItem>
            <SelectItem value="service">Service Requests</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, institution..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" className="gap-2">
          <Download size={16} />
          Export CSV
        </Button>
      </div>

      {recordType === "attendance" ? (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Visitor Attendance ({filteredAttendance.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.date}</TableCell>
                      <TableCell className="font-medium text-sm">{r.name}</TableCell>
                      <TableCell className="text-sm">{r.position}</TableCell>
                      <TableCell className="text-sm">{r.institution}</TableCell>
                      <TableCell className="text-sm">{r.contact}</TableCell>
                      <TableCell className="text-sm">{r.time}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedRecord(r)}>
                              <Eye size={16} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Visitor Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 text-sm">
                              <div className="grid grid-cols-2 gap-3">
                                <div><span className="text-muted-foreground">Name:</span><p className="font-medium">{r.name}</p></div>
                                <div><span className="text-muted-foreground">Position:</span><p className="font-medium">{r.position}</p></div>
                                <div><span className="text-muted-foreground">Institution:</span><p className="font-medium">{r.institution}</p></div>
                                <div><span className="text-muted-foreground">Contact Type:</span><p className="font-medium">{r.contactType}</p></div>
                                <div><span className="text-muted-foreground">Contact:</span><p className="font-medium">{r.contact}</p></div>
                                <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{r.email}</p></div>
                                <div><span className="text-muted-foreground">Date:</span><p className="font-medium">{r.date}</p></div>
                                <div><span className="text-muted-foreground">Time:</span><p className="font-medium">{r.time}</p></div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Service Requests ({filteredServices.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.date}</TableCell>
                      <TableCell className="font-medium text-sm">{r.name}</TableCell>
                      <TableCell className="text-sm">{r.service}</TableCell>
                      <TableCell className="text-sm">{r.eventDate}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.status === "Completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedRecord(r)}>
                              <Eye size={16} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Service Request Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 text-sm">
                              <div className="grid grid-cols-2 gap-3">
                                <div><span className="text-muted-foreground">Name:</span><p className="font-medium">{r.name}</p></div>
                                <div><span className="text-muted-foreground">Phone:</span><p className="font-medium">{r.phone}</p></div>
                                <div><span className="text-muted-foreground">Passport:</span><p className="font-medium">{r.passport}</p></div>
                                <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{r.email}</p></div>
                                <div><span className="text-muted-foreground">Service:</span><p className="font-medium">{r.service}</p></div>
                                <div><span className="text-muted-foreground">Event Date:</span><p className="font-medium">{r.eventDate}</p></div>
                                <div className="col-span-2"><span className="text-muted-foreground">Status:</span><p className="font-medium">{r.status}</p></div>
                                <div className="col-span-2"><span className="text-muted-foreground">Message:</span><p className="font-medium">{r.message}</p></div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
