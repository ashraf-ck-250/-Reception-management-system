import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, FileText } from "lucide-react";
import VisitorAttendance from "@/pages/VisitorAttendance";
import ServiceRequest from "@/pages/ServiceRequest";
import gov from "@/assets/gov.png";

export default function PublicFormLayout({ initialTab = "attendance" }: { initialTab?: "attendance" | "service" }) {
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
              <img src={gov} alt="RWANDA Goverment Logo" width={80} height={80} className="rounded-xl" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">ReceptionMS</h1>
              <p className="text-xs text-muted-foreground">Reception Management System</p>
            </div>
          </div>
          <Link
            to="/login"
            className="text-xs text-muted-foreground hover:text-primary transition-all duration-150 active:opacity-70 outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
          >
            Staff Login →
          </Link>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="flex gap-2 bg-muted p-1 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => setTab("attendance")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all duration-150 active:scale-[0.99] ${
              tab === "attendance" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardList size={16} />
            Visitor Attendance
          </button>
          <button
            type="button"
            onClick={() => setTab("service")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all duration-150 active:scale-[0.99] ${
              tab === "service" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText size={16} />
            Service Request
          </button>
        </div>
      </div>

      {/* Form content */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        {tab === "attendance" ? <VisitorAttendance /> : <ServiceRequest />}
      </div>
    </div>
  );
}
