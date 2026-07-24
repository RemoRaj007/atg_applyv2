import React from "react";
import * as LucideIcons from "lucide-react";

export type IconName =
    | "Dashboard" | "dashboard"
    | "AddCircle" | "add-job"
    | "RateReview"
    | "EventAvailable"
    | "EventNote"
    | "Schedule"
    | "Cancel" | "skip"
    | "AccountCircle" | "profile"
    | "Lock"
    | "Search"
    | "Add"
    | "Business" | "briefcase"
    | "Person"
    | "Email"
    | "Setting" | "settings"
    | "Phone"
    | "Resources" | "documents"
    | "Criteria"
    | "Bookings" | "applications"
    | "Services"
    | "Users" | "users"
    | "userRole" | "shield"
    | "Remark"
    | "AddNew"
    | "View"
    | "Log" | "logout"
    | "MyBooking"
    | "User"
    | "Delete"
    | "Edit"
    | "Next"
    | "Prev"
    | "Back"
    | "bell"
    | "approve"
    | "alert"
    | "scholarship"
    | "payments"
    | "upgrade"
    | "support"
    | "team-capacity"
    | "export";

type Props = {
    iconName: IconName;
    iconSize?: number;
    iconColor?: string;
    marginRight?: number;
    className?: string;
};

const LUCIDE_ALIAS_REGISTRY: Record<string, keyof typeof LucideIcons> = {
    Dashboard: "LayoutDashboard",
    dashboard: "LayoutDashboard",
    AddCircle: "PlusCircle",
    "add-job": "PlusCircle",
    RateReview: "MessageSquare",
    EventAvailable: "CalendarCheck",
    EventNote: "Calendar",
    Schedule: "Clock",
    Cancel: "XCircle",
    skip: "XCircle",
    AccountCircle: "UserCircle",
    profile: "UserCircle",
    Lock: "Lock",
    Search: "Search",
    Add: "Plus",
    Business: "Building",
    briefcase: "Briefcase",
    Person: "User",
    Email: "Mail",
    Setting: "Activity",
    settings: "Settings",
    Phone: "Phone",
    Resources: "Building2",
    documents: "FileText",
    Criteria: "ArrowUpWideNarrow",
    Bookings: "NotepadText",
    applications: "ClipboardList",
    Services: "CopyCheck",
    Users: "SquareUserRound",
    users: "Users",
    userRole: "ShieldUser",
    shield: "Shield",
    Remark: "FileCheck2",
    AddNew: "CirclePlus",
    View: "Eye",
    Log: "LogIn",
    logout: "LogOut",
    MyBooking: "BookOpenText",
    User: "User",
    Delete: "Trash2",
    Edit: "SquarePen",
    Next: "ChevronRight",
    Prev: "ChevronLeft",
    Back: "ArrowLeft",
    bell: "Bell",
    approve: "CheckCircle2",
    alert: "AlertCircle",
    scholarship: "GraduationCap",
    payments: "CreditCard",
    upgrade: "TrendingUp",
    support: "LifeBuoy",
    "team-capacity": "Gauge",
    export: "Download",
};

const resolveIcon = (name: string): React.ComponentType<any> | null => {
    const targetKey = LUCIDE_ALIAS_REGISTRY[name];
    if (targetKey && LucideIcons[targetKey]) {
        return LucideIcons[targetKey] as React.ComponentType<any>;
    }
    return null;
};

const getIconComponent = ({
    iconName,
    iconSize = 24,
    marginRight = 0,
    iconColor,
    className,
}: Props): React.ReactElement | null => {
    const Component = resolveIcon(iconName);

    if (!Component) {
        console.warn(`Icon '${iconName}' not found in iconMap`);
        return null;
    }

    return (
        <Component
            size={iconSize}
            color={iconColor}
            className={className}
            style={{ marginRight }}
        />
    );
};

export default getIconComponent;
