"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LogOut,
  Calendar,
  FileText,
  ArrowLeft,
  Users,
  UserPlus,
  Menu,
  X,
  Home,
  Rss,
  Download,
  Send,
  CheckCircle,
} from "lucide-react";
import { ViewDailyTasks } from "@/components/view-daily-tasks";
import { ViewWeeklyTasks } from "@/components/view-weekly-tasks";
import { ProfileSettings } from "@/components/profile-settings";
import { ManageStaff } from "@/components/manage-staff";
import { AssignTasks } from "@/components/assign-tasks";
import { StaffListView } from "@/components/staff-list-view";
import { TaskFeed } from "@/components/task-feed";
import { TaskDownload } from "@/components/task-download";
import { SecureImage } from "@/components/secure-image";
import { useIsMobile } from "@/hooks/use-mobile";

interface User {
  id: string;
  name: string;
  email: string;
  role: "staff" | "manager" | "bk";
  avatar?: string;
  avatarKey?: string;
  telegramChatId?: string | number | null;
}

interface ManagerDashboardProps {
  user: User;
}

type ViewType =
  | "menu"
  | "view-daily-tasks"
  | "view-weekly-tasks"
  | "manage-staff"
  | "assign-tasks"
  | "staff-list"
  | "task-feed"
  | "task-download"
  | "profile";

export function ManagerDashboard({ user }: ManagerDashboardProps) {
  const [currentView, setCurrentView] = useState<ViewType>("menu");
  const [selectedStaffForDailyTasks, setSelectedStaffForDailyTasks] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMobile = useIsMobile();
  const { update } = useSession();

  // telegram state
  const [telegramLink, setTelegramLink] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTelegramConnected = !!user.telegramChatId;

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleTelegramConnect = async () => {
    setIsConnecting(true);
    setConnectError("");
    setTelegramLink("");
    try {
      const response = await fetch("api/generate-code", {
        method: "POST",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate connection link."
        );
      }
      const data = await response.json();
      setTelegramLink(data.link);
      window.open(data.link, "_blank", "noopener,noreferrer");

      startPollingForConnection();
    } catch (error: any) {
      setConnectError(error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const startPollingForConnection = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    let pollCount = 0;
    const maxPolls = 40;

    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;
      try {
        const response = await fetch(`/api/users?role=manager`);
        if (response.ok) {
          const data = await response.json();
          const currentUser = data.users.find((u: any) => u.id === user.id);
          if (currentUser?.telegramChatId) {
            await update({ telegramChatId: currentUser.telegramChatId });
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setTelegramLink("");
            window.location.reload();
            return;
          }
        }
      } catch (error) {
        console.error("Error polling for connection:", error);
      }

      if (pollCount >= maxPolls) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setTelegramLink("");
      }
    }, 3000);
  };

  const handleLogout = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    signOut({ callbackUrl: "/" });
  };

  const handleViewStaffProgress = (staffId: string, staffName: string) => {
    setSelectedStaffForDailyTasks({ id: staffId, name: staffName });
    setCurrentView("view-daily-tasks");
  };

  const renderHeader = () => (
    <div className="mb-4 sm:mb-6 p-4 sm:p-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-[#ff7a30]">
            {user.avatarKey ? (
              <SecureImage
                imageKey={user.avatarKey}
                alt={`${user.name}'s avatar`}
                className="h-full w-full rounded-full object-cover"
                fallback={
                  <AvatarFallback className="bg-[#465c88] text-white">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                }
              />
            ) : (
              <>
                <AvatarImage src={user.avatar || "/placeholder.svg"} />
                <AvatarFallback className="bg-[#465c88] text-white">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Welcome back, {user.name}!
            </h1>
            <p className="text-sm sm:text-base text-gray-300">
              Manager Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="text-white hover:bg-white/20 lg:hidden"
          >
            {showMobileMenu ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          {/* Desktop buttons */}
          <div className="hidden lg:flex items-center space-x-2">
            {isTelegramConnected ? (
              <Button
                variant="outline"
                disabled
                className="bg-green-600 text-white border-green-600 cursor-not-allowed"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Connected
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleTelegramConnect}
                disabled={isConnecting}
                className="bg-sky-500 hover:bg-sky-500/90 text-white border-sky-500 hover:border-sky-500/90"
              >
                <Send className="h-4 w-4 mr-2" />
                {isConnecting ? "Generating..." : "Connect Telegram"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setCurrentView("profile")}
              className="bg-[#ff7a30] hover:bg-[#ff7a30]/90 text-white border-[#ff7a30] hover:border-[#ff7a30]/90"
            >
              Profile
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="bg-[#465c88] hover:bg-[#465c88]/90 text-white border-[#465c88] hover:border-[#465c88]/90"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </div>
      {telegramLink && (
        <div className="mt-4 p-3 bg-green-900/50 border border-green-500/50 rounded-lg">
          <p className="text-sm text-green-200 text-center mb-3">
            Connection link generated! Check the new tab or{" "}
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline hover:text-white"
            >
              click here to open it.
            </a>
          </p>
        </div>
      )}
      {connectError && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-center">
          <p className="text-sm text-red-200">Error: {connectError}</p>
        </div>
      )}
    </div>
  );

  // Mobile slide-out menu
  const renderMobileMenu = () => (
    <>
      {/* Overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Slide-out menu */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white/10 backdrop-blur-lg border-l border-white/20 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          showMobileMenu ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Menu</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileMenu(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => {
                setCurrentView("view-daily-tasks");
                setShowMobileMenu(false);
              }}
              className={`w-full justify-start text-left h-auto p-4 ${
                currentView === "view-daily-tasks"
                  ? "bg-[#ff7a30] text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5" />
                <div>
                  <div className="font-medium">Daily Tasks</div>
                  <div className="text-xs opacity-75">View and manage</div>
                </div>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setCurrentView("view-weekly-tasks");
                setShowMobileMenu(false);
              }}
              className={`w-full justify-start text-left h-auto p-4 ${
                currentView === "view-weekly-tasks"
                  ? "bg-[#465c88] text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5" />
                <div>
                  <div className="font-medium">Weekly Tasks</div>
                  <div className="text-xs opacity-75">Review progress</div>
                </div>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setCurrentView("manage-staff");
                setShowMobileMenu(false);
              }}
              className={`w-full justify-start text-left h-auto p-4 ${
                currentView === "manage-staff"
                  ? "bg-[#ff7a30] text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5" />
                <div>
                  <div className="font-medium">Manage Staff</div>
                  <div className="text-xs opacity-75">Team members</div>
                </div>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setCurrentView("assign-tasks");
                setShowMobileMenu(false);
              }}
              className={`w-full justify-start text-left h-auto p-4 ${
                currentView === "assign-tasks"
                  ? "bg-[#465c88] text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <UserPlus className="h-5 w-5" />
                <div>
                  <div className="font-medium">Assign Tasks</div>
                  <div className="text-xs opacity-75">Delegate work</div>
                </div>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setCurrentView("task-feed");
                setShowMobileMenu(false);
              }}
              className={`w-full justify-start text-left h-auto p-4 ${
                currentView === "task-feed"
                  ? "bg-[#ff7a30] text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Rss className="h-5 w-5" />
                <div>
                  <div className="font-medium">Task Feed</div>
                  <div className="text-xs opacity-75">All team tasks</div>
                </div>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setCurrentView("task-download");
                setShowMobileMenu(false);
              }}
              className={`w-full justify-start text-left h-auto p-4 ${
                currentView === "task-download"
                  ? "bg-[#ff7a30] text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Download className="h-5 w-5" />
                <div>
                  <div className="font-medium">Download Tasks</div>
                  <div className="text-xs opacity-75">Export reports</div>
                </div>
              </div>
            </Button>

            <div className="pt-6 border-t border-white/20">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentView("profile");
                  setShowMobileMenu(false);
                }}
                className="w-full bg-[#ff7a30] hover:bg-[#ff7a30]/90 text-white border-[#ff7a30] hover:border-[#ff7a30]/90"
              >
                Profile
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                handleLogout();
                setShowMobileMenu(false);
              }}
              className="w-full bg-[#465c88] hover:bg-[#465c88]/90 text-white border-[#465c88] hover:border-[#465c88]/90"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  const renderSidebar = () => (
    <div className="hidden lg:block w-64 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 h-fit">
      <div className="space-y-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">Navigation</h2>
          <div className="w-12 h-1 bg-[#ff7a30] rounded"></div>
        </div>

        {user.role !== "bk" && (
          <Button
            variant="ghost"
            onClick={() => setCurrentView("task-feed")}
            className={`w-full justify-start text-left h-auto p-4 ${
              currentView === "task-feed"
                ? "bg-[#ff7a30] text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <div className="flex items-center space-x-3">
              <Rss className="h-5 w-5" />
              <div>
                <div className="font-medium">Task Feed</div>
                <div className="text-xs opacity-75">All team tasks</div>
              </div>
            </div>
          </Button>
        )}

        {user.role !== "bk" && (
          <Button
            variant="ghost"
            onClick={() => setCurrentView("task-download")}
            className={`w-full justify-start text-left h-auto p-4 ${
              currentView === "task-download"
                ? "bg-[#ff7a30] text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <div className="flex items-center space-x-3">
              <Download className="h-5 w-5" />
              <div>
                <div className="font-medium">Download Tasks</div>
                <div className="text-xs opacity-75">Export reports</div>
              </div>
            </div>
          </Button>
        )}

        {user.role !== "bk" && (
          <Button
            variant="ghost"
            onClick={() => setCurrentView("assign-tasks")}
            className={`w-full justify-start text-left h-auto p-4 ${
              currentView === "assign-tasks"
                ? "bg-[#465c88] text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <div className="flex items-center space-x-3">
              <UserPlus className="h-5 w-5" />
              <div>
                <div className="font-medium">Assign Tasks</div>
                <div className="text-xs opacity-75">Delegate work</div>
              </div>
            </div>
          </Button>
        )}

        <Button
          variant="ghost"
          onClick={() => setCurrentView("view-daily-tasks")}
          className={`w-full justify-start text-left h-auto p-4 ${
            currentView === "view-daily-tasks"
              ? "bg-[#ff7a30] text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5" />
            <div>
              <div className="font-medium">Daily Tasks</div>
              <div className="text-xs opacity-75">View and manage</div>
            </div>
          </div>
        </Button>

        <Button
          variant="ghost"
          onClick={() => setCurrentView("view-weekly-tasks")}
          className={`w-full justify-start text-left h-auto p-4 ${
            currentView === "view-weekly-tasks"
              ? "bg-[#465c88] text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5" />
            <div>
              <div className="font-medium">Weekly Tasks</div>
              <div className="text-xs opacity-75">Review progress</div>
            </div>
          </div>
        </Button>

        {user.role !== "bk" && (
          <Button
            variant="ghost"
            onClick={() => setCurrentView("manage-staff")}
            className={`w-full justify-start text-left h-auto p-4 ${
              currentView === "manage-staff"
                ? "bg-[#ff7a30] text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5" />
              <div>
                <div className="font-medium">Manage Staff</div>
                <div className="text-xs opacity-75">Team members</div>
              </div>
            </div>
          </Button>
        )}

        {user.role === "bk" && (
          <Button
            variant="ghost"
            onClick={() => setCurrentView("staff-list")}
            className={`w-full justify-start text-left h-auto p-4 ${
              currentView === "staff-list"
                ? "bg-[#ff7a30] text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5" />
              <div>
                <div className="font-medium">Staff Directory</div>
                <div className="text-xs opacity-75">View team members</div>
              </div>
            </div>
          </Button>
        )}
      </div>
    </div>
  );

  const renderMainMenu = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 sm:gap-6">
      {user.role !== "bk" && (
        <Card
          className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
          onClick={() => setCurrentView("task-feed")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 sm:p-3 bg-[#ff7a30] rounded-xl group-hover:bg-[#ff7a30]/90 transition-colors">
                <Rss className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-base sm:text-lg">
                  Task Feed
                </CardTitle>
                <CardDescription className="text-gray-300 text-sm">
                  View all team tasks
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {user.role !== "bk" && (
        <Card
          className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
          onClick={() => setCurrentView("task-download")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 sm:p-3 bg-[#465c88] rounded-xl group-hover:bg-[#465c88]/90 transition-colors">
                <Download className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-base sm:text-lg">
                  Download Tasks
                </CardTitle>
                <CardDescription className="text-gray-300 text-sm">
                  Export task reports
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {user.role !== "bk" && (
        <Card
          className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
          onClick={() => setCurrentView("assign-tasks")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 sm:p-3 bg-[#465c88] rounded-xl group-hover:bg-[#465c88]/90 transition-colors">
                <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-base sm:text-lg">
                  Assign Tasks
                </CardTitle>
                <CardDescription className="text-gray-300 text-sm">
                  Assign tasks to staff
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card
        className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
        onClick={() => setCurrentView("view-daily-tasks")}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-3 bg-[#ff7a30] rounded-xl group-hover:bg-[#ff7a30]/90 transition-colors">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-base sm:text-lg">
                Daily Tasks
              </CardTitle>
              <CardDescription className="text-gray-300 text-sm">
                View and manage daily tasks
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card
        className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
        onClick={() => setCurrentView("view-weekly-tasks")}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-3 bg-[#465c88] rounded-xl group-hover:bg-[#465c88]/90 transition-colors">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-base sm:text-lg">
                Weekly Tasks
              </CardTitle>
              <CardDescription className="text-gray-300 text-sm">
                Review weekly progress
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {user.role !== "bk" && (
        <Card
          className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
          onClick={() => setCurrentView("manage-staff")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 sm:p-3 bg-[#ff7a30] rounded-xl group-hover:bg-[#ff7a30]/90 transition-colors">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-base sm:text-lg">
                  Manage Staff
                </CardTitle>
                <CardDescription className="text-gray-300 text-sm">
                  Manage team members
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {user.role === "bk" && (
        <Card
          className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
          onClick={() => setCurrentView("staff-list")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 sm:p-3 bg-[#ff7a30] rounded-xl group-hover:bg-[#ff7a30]/90 transition-colors">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-base sm:text-lg">
                  Staff Directory
                </CardTitle>
                <CardDescription className="text-gray-300 text-sm">
                  View all team members
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case "assign-tasks":
        return <AssignTasks onViewStaffProgress={handleViewStaffProgress} />;
      case "staff-list":
        return <StaffListView />;
      case "view-daily-tasks":
        return (
          <ViewDailyTasks
            initialSelectedStaffId={selectedStaffForDailyTasks?.id}
            initialSelectedStaffName={selectedStaffForDailyTasks?.name}
          />
        );
      case "view-weekly-tasks":
        return <ViewWeeklyTasks />;
      case "manage-staff":
        return <ManageStaff />;
      case "task-feed":
        return <TaskFeed />;
      case "task-download":
        return <TaskDownload onBack={() => setCurrentView("menu")} />;
      case "profile":
        return <ProfileSettings user={user} />;
      default:
        return renderMainMenu();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#465c88] via-[#000000] to-[#ff7a30]">
      <div className="container mx-auto p-4 sm:p-6">
        {renderHeader()}
        {renderMobileMenu()}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar for large screens */}
          {renderSidebar()}

          {/* Main content area */}
          <div className="flex-1 rounded-2xl p-4 sm:p-6 border border-white/10  ">
            {renderCurrentView()}
          </div>
        </div>
      </div>
    </div>
  );
}
