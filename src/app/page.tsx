"use client";

import CanvasContainer from "@/components/canvas/CanvasContainer";
import Sidebar from "@/components/layout/Sidebar";
import DockInput from "@/components/input/DockInput";
import ChatHandler from "@/components/canvas/ChatHandler";
import { CanvasProvider } from "@/contexts/CanvasContext";
import { ReactFlowProvider } from 'reactflow';

export default function Home() {
  return (
    <CanvasProvider>
      <ReactFlowProvider>
        <ChatHandler />
        <main className="flex h-screen w-full overflow-hidden bg-background relative">
          {/* Sidebar - Local History/Sessions */}
          <Sidebar />

          {/* Main Area: Infinite Canvas */}
          <div className="flex-1 relative h-full">
            <CanvasContainer />
            
            {/* Global Dock Input - Fixed at Bottom Center */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-fit max-w-2xl px-4 z-50">
              <DockInput />
            </div>
          </div>
        </main>
      </ReactFlowProvider>
    </CanvasProvider>
  );
}
