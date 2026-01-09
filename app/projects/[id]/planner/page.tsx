"use client";
"use client";
import { useState } from "react";
import TaskBoard from "./TaskBoard";
import ChecklistPanel from "./ChecklistPanel";
import RollupSummary from "./RollupSummary";
import { TaskDetailsModal } from "@/components/project/TaskDetailsModal";

export default function PlannerPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Handler to open modal with selected task
  const handleViewTask = (taskId: string) => {
    console.log('handleViewTask called with taskId:', taskId);
    setSelectedTaskId(taskId);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Project Planner</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <TaskBoard onViewTask={handleViewTask} />
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <ChecklistPanel />
          <RollupSummary />
        </div>
      </div>
      <TaskDetailsModal
        taskId={selectedTaskId}
        open={modalOpen}
        onOpenChange={(open: boolean) => {
          console.log('TaskDetailsModal onOpenChange:', open, 'selectedTaskId:', selectedTaskId);
          setModalOpen(open);
          if (!open) setSelectedTaskId(null);
        }}
      />
    </div>
  );
}
