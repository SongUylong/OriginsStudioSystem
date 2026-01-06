"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserMinus, Users, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function StaffManagement() {
  const [staffMembers] = useState([
    {
      id: "1",
      name: "John Doe",
      email: "john@origins.com",
      status: "active",
      tasksCompleted: 45,
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@origins.com",
      status: "active",
      tasksCompleted: 38,
    },
    {
      id: "3",
      name: "Mike Johnson",
      email: "mike@origins.com",
      status: "inactive",
      tasksCompleted: 12,
    },
  ]);

  const handleRemoveStaff = (staffId: string) => {
    // Handle staff removal
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Staff Management
        </CardTitle>
        <CardDescription>Manage staff accounts and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {staffMembers.map((staff) => (
            <div
              key={staff.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback>
                    {staff.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{staff.name}</h3>
                  <p className="text-sm text-gray-600">{staff.email}</p>
                  <p className="text-xs text-gray-500">
                    {staff.tasksCompleted} tasks completed
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge
                  variant={staff.status === "active" ? "default" : "secondary"}
                >
                  {staff.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit Profile</DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Remove Staff
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Remove Staff Member
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {staff.name} from
                            the team? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveStaff(staff.id)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
