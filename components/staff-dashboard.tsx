"use client";
import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LogOut,
  Calendar,
  History,
  Users,
  ArrowLeft,
  MessageSquare,
  FileText,
  Menu,
  X,
  Send,
  Home,
  CheckCircle,
} from "lucide-react";
import { TodayTasks } from "@/components/today-tasks";
import { PreviousTasks } from "@/components/previous-tasks";
import { TeamDaily } from "@/components/team-daily";
import { ProfileSettings } from "@/components/profile-settings";
import { ViewFeedback } from "@/components/view-feedback";
import { WeeklyTaskReport } from "@/components/weekly-task-report";
import { SecureImage } from "@/components/secure-image";

interface StaffDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: "staff" | "manager" | "bk";
    avatar?: string;
    avatarKey?: string;
    telegramChatId?: string | number | null;
  };
}

type ViewType =
  | "menu"
  | "today-tasks"
  | "previous-tasks"
  | "team-daily"
  | "view-feedback"
  | "weekly-report"
  | "profile";

export function StaffDashboard({ user }: StaffDashboardProps) {
  const [currentView, setCurrentView] = useState<ViewType>("today-tasks");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { update } = useSession();

  //telegram state
  const [telegramLink, setTelegramLink] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTelegramConnected = !!user.telegramChatId;

  // Cleanup polling interval on component unmount
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

      // Start polling to check if user has connected
      startPollingForConnection();
    } catch (error: any) {
      setConnectError(error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const startPollingForConnection = () => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 3 seconds for up to 2 minutes
    let pollCount = 0;
    const maxPolls = 40; // 2 minutes / 3 seconds

    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;

      try {
        // Check current user data from the database
        const response = await fetch(`/api/users?role=staff`);
        if (response.ok) {
          const data = await response.json();
          const currentUser = data.users.find((u: any) => u.id === user.id);

          if (currentUser?.telegramChatId) {
            // Connection successful! Update the session
            await update({
              telegramChatId: currentUser.telegramChatId,
            });

            // Clear polling and reset states
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setTelegramLink("");

            // Force a page refresh to show the updated state
            window.location.reload();
            return;
          }
        }
      } catch (error) {
        console.error("Error polling for connection:", error);
      }

      // Stop polling after max attempts
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
    // Clear any active polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    signOut({ callbackUrl: "/" });
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
              Staff Dashboard
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
            {}
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
                setCurrentView("today-tasks");
                setShowMobileMenu(false);
              }}
              className={`w-full justify-start text-left h-auto p-4 ${
                currentView === "today-tasks"
                  ? "bg-[#ff7a30] text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5" />
                <div>
                  <div className="font-medium">Today's Tasks</div>
                  <div className="text-xs opacity-75">View and update</div>
                </div>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setCurrentView("previous-tasks");
                setShowMobileMenu(false);
              }}
              className={`w-full justify-start text-left h-auto p-4 ${
                currentView === "previous-tasks"
                  ? "bg-[#465c88] text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <History className="h-5 w-5" />
                <div>
                  <div className="font-medium">Previous Tasks</div>
                  <div className="text-xs opacity-75">Review completed</div>
                </div>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setCurrentView("team-daily");
                setShowMobileMenu(false);
              }}
              className={`w-full justify-start text-left h-auto p-4 ${
                currentView === "team-daily"
                  ? "bg-[#ff7a30] text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5" />
                <div>
                  <div className="font-medium">Team Daily</div>
                  <div className="text-xs opacity-75">View team updates</div>
                </div>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setCurrentView("view-feedback");
                setShowMobileMenu(false);
              }}
              className={`w-full justify-start text-left h-auto p-4 ${
                currentView === "view-feedback"
                  ? "bg-[#465c88] text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-5 w-5" />
                <div>
                  <div className="font-medium">View Feedback</div>
                  <div className="text-xs opacity-75">Check reviews</div>
                </div>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setCurrentView("weekly-report");
                setShowMobileMenu(false);
              }}
              className={`w-full justify-start text-left h-auto p-4 ${
                currentView === "weekly-report"
                  ? "bg-[#ff7a30] text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5" />
                <div>
                  <div className="font-medium">Weekly Report</div>
                  <div className="text-xs opacity-75">Generate reports</div>
                </div>
              </div>
            </Button>

            <div className="pt-6 border-t border-white/20">
              {isTelegramConnected ? (
                <Button
                  variant="outline"
                  disabled
                  className="w-full bg-green-600 text-white border-green-600 mb-4 cursor-not-allowed"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Connected
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleTelegramConnect}
                  disabled={isConnecting}
                  className="w-full bg-sky-500 hover:bg-sky-500/90 text-white border-sky-500 hover:border-sky-500/90 mb-4"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isConnecting ? "Generating..." : "Connect Telegram"}
                </Button>
              )}
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

        <Button
          variant="ghost"
          onClick={() => setCurrentView("today-tasks")}
          className={`w-full justify-start text-left h-auto p-4 ${
            currentView === "today-tasks"
              ? "bg-[#ff7a30] text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5" />
            <div>
              <div className="font-medium">Today's Tasks</div>
              <div className="text-xs opacity-75">View and update</div>
            </div>
          </div>
        </Button>

        <Button
          variant="ghost"
          onClick={() => setCurrentView("previous-tasks")}
          className={`w-full justify-start text-left h-auto p-4 ${
            currentView === "previous-tasks"
              ? "bg-[#465c88] text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-3">
            <History className="h-5 w-5" />
            <div>
              <div className="font-medium">Previous Tasks</div>
              <div className="text-xs opacity-75">Review completed</div>
            </div>
          </div>
        </Button>

        <Button
          variant="ghost"
          onClick={() => setCurrentView("team-daily")}
          className={`w-full justify-start text-left h-auto p-4 ${
            currentView === "team-daily"
              ? "bg-[#ff7a30] text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5" />
            <div>
              <div className="font-medium">Team Daily</div>
              <div className="text-xs opacity-75">View team updates</div>
            </div>
          </div>
        </Button>

        <Button
          variant="ghost"
          onClick={() => setCurrentView("view-feedback")}
          className={`w-full justify-start text-left h-auto p-4 ${
            currentView === "view-feedback"
              ? "bg-[#465c88] text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-5 w-5" />
            <div>
              <div className="font-medium">View Feedback</div>
              <div className="text-xs opacity-75">
                Check feedback and reviews
              </div>
            </div>
          </div>
        </Button>

        <Button
          variant="ghost"
          onClick={() => setCurrentView("weekly-report")}
          className={`w-full justify-start text-left h-auto p-4 ${
            currentView === "weekly-report"
              ? "bg-[#ff7a30] text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5" />
            <div>
              <div className="font-medium">Weekly Report</div>
              <div className="text-xs opacity-75">Generate reports</div>
            </div>
          </div>
        </Button>
      </div>
    </div>
  );

  const renderMainMenu = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 sm:gap-6">
      <Card
        className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
        onClick={() => setCurrentView("today-tasks")}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-3 bg-[#ff7a30] rounded-xl group-hover:bg-[#ff7a30]/90 transition-colors">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-base sm:text-lg">
                Today's Tasks
              </CardTitle>
              <CardDescription className="text-gray-300 text-sm">
                View and update today's tasks
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card
        className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
        onClick={() => setCurrentView("previous-tasks")}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-3 bg-[#465c88] rounded-xl group-hover:bg-[#465c88]/90 transition-colors">
              <History className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-base sm:text-lg">
                Previous Tasks
              </CardTitle>
              <CardDescription className="text-gray-300 text-sm">
                Review completed tasks
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card
        className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
        onClick={() => setCurrentView("team-daily")}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-3 bg-[#ff7a30] rounded-xl group-hover:bg-[#ff7a30]/90 transition-colors">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-base sm:text-lg">
                Team Daily
              </CardTitle>
              <CardDescription className="text-gray-300 text-sm">
                View team updates
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card
        className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
        onClick={() => setCurrentView("view-feedback")}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-3 bg-[#465c88] rounded-xl group-hover:bg-[#465c88]/90 transition-colors">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-base sm:text-lg">
                View Feedback
              </CardTitle>
              <CardDescription className="text-gray-300 text-sm">
                Check feedback and reviews
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card
        className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer group"
        onClick={() => setCurrentView("weekly-report")}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-3 bg-[#ff7a30] rounded-xl group-hover:bg-[#ff7a30]/90 transition-colors">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-base sm:text-lg">
                Weekly Report
              </CardTitle>
              <CardDescription className="text-gray-300 text-sm">
                Generate weekly reports
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case "today-tasks":
        return <TodayTasks user={user} />;
      case "previous-tasks":
        return <PreviousTasks user={user} />;
      case "team-daily":
        return <TeamDaily user={user} />;
      case "view-feedback":
        return <ViewFeedback user={user} />;
      case "weekly-report":
        return <WeeklyTaskReport user={user} />;
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

        {/* Mobile slide-out menu */}
        {renderMobileMenu()}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar for large screens */}
          {renderSidebar()}

          {/* Main content area */}
          <div className="flex-1 rounded-2xl p-4 sm:p-6 border border-white/10 ">
            {renderCurrentView()}
          </div>
        </div>
      </div>
    </div>
  );
}
