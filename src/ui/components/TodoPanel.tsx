/**
 * TodoPanel - Displays agent's task plan with progress bar (collapsible)
 */

import { useState } from "react";
import type { TodoItem, TodoStatus } from "../types";

interface TodoPanelProps {
  todos: TodoItem[];
}

const statusConfig: Record<TodoStatus, { emoji: string }> = {
  pending: { emoji: '⬜' },
  in_progress: { emoji: '🔄' },
  completed: { emoji: '✅' },
  cancelled: { emoji: '❌' }
};

export function TodoPanel({ todos }: TodoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (!todos || todos.length === 0) return null;

  const completed = todos.filter(t => t.status === 'completed').length;
  const cancelled = todos.filter(t => t.status === 'cancelled').length;
  const total = todos.length;
  const percent = Math.round((completed / total) * 100);
  const inProgress = todos.find(t => t.status === 'in_progress');
  const isAllDone = completed + cancelled === total;

  return (
    <div className={`border rounded-lg shadow-sm ${isAllDone ? 'bg-green-50 border-green-200' : 'bg-white border-ink-200'}`}>
      {/* Header - always visible, clickable to expand/collapse */}
      <button 
        type="button"
        className="w-full flex items-center justify-between p-2.5 cursor-pointer select-none hover:bg-ink-50/50 transition-colors text-left rounded-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span 
            className="text-xs text-ink-400 transition-transform duration-200 inline-block flex-shrink-0"
            style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            ▼
          </span>
          <span className="text-sm font-medium text-ink-700 flex-shrink-0">
            {isAllDone ? '✅ Plan Complete' : '📋 Task Plan'}
          </span>
          <span className="text-xs text-ink-500 flex-shrink-0">
            {completed}/{total}
          </span>
          {/* Show current task when collapsed */}
          {!isExpanded && inProgress && (
            <span className="text-xs text-blue-600 truncate ml-1">
              → {inProgress.content}
            </span>
          )}
          {/* Show completion message when collapsed and done */}
          {!isExpanded && isAllDone && (
            <span className="text-xs text-green-600 ml-1">
              All tasks completed!
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mini progress bar when collapsed */}
          {!isExpanded && (
            <div className="h-1.5 w-16 bg-ink-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${isAllDone ? 'bg-green-500' : 'bg-green-500'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
          <span className={`text-xs font-mono ${isAllDone ? 'text-green-600 font-semibold' : 'text-ink-500'}`}>{percent}%</span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <>
          {/* Progress bar */}
          <div className={`h-1.5 mx-3 mb-2 rounded-full overflow-hidden ${isAllDone ? 'bg-green-200' : 'bg-ink-100'}`}>
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="px-3 pb-3">
            {/* Completion banner */}
            {isAllDone && (
              <div className="bg-green-100 border border-green-300 rounded px-2 py-1.5 mb-2 text-center">
                <span className="text-xs text-green-700 font-medium">
                  🎉 All {completed} tasks completed!
                </span>
              </div>
            )}
            
            {/* Current task highlight */}
            {!isAllDone && inProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🔄</span>
                  <span className="text-xs text-blue-700 font-medium">
                    {inProgress.content}
                  </span>
                </div>
              </div>
            )}

            {/* Task list - SCROLLABLE */}
            <div 
              className="todo-scroll-container"
              onWheel={(e) => {
                e.stopPropagation();
                const el = e.currentTarget;
                el.scrollTop += e.deltaY;
              }}
              style={{ 
                maxHeight: '150px',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
            >
              <div className="space-y-1 pr-1">
                {todos.map((todo) => {
                  const config = statusConfig[todo.status];
                  return (
                    <div
                      key={todo.id}
                      className={`flex items-start gap-2 px-2 py-1 rounded text-xs ${
                        todo.status === 'in_progress' ? 'bg-blue-50' : 'hover:bg-ink-50'
                      }`}
                    >
                      <span className="flex-shrink-0">{config.emoji}</span>
                      <span 
                        className={`break-words ${
                          todo.status === 'completed' ? 'line-through text-ink-400' : 
                          todo.status === 'cancelled' ? 'line-through text-ink-400' :
                          'text-ink-700'
                        }`}
                      >
                        {todo.content}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
