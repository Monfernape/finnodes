'use client'
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Github } from "lucide-react";

export const LoginForm = () => {
  const handleGitHubLogin = () => {
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          onClick={handleGitHubLogin}
        >
          <Github className="mr-2 h-4 w-4" />
          Sign in with GitHub
        </Button>
      </CardContent>
    </Card>
  );
};
