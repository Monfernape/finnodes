"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RichTextEditor } from "@/components/people/RichTextEditor";
import { PeopleSection } from "@/components/people/PeopleSection";
import { createClient } from "@/utils/supabase/client";
import { DatabaseTable } from "@/utils/supabase/db";
import {
  EMPTY_TIPTAP_DOC,
  OneOnOneStatus,
  type ManagerPrivateNote,
  type OneOnOne,
  type TiptapDoc,
} from "@/entities";
import { normalizeTiptapDoc } from "@/lib/people";

type OneOnOneEditorProps = {
  seatId: number;
  year: number;
  month: number;
  initialOneOnOne: OneOnOne | null;
  afterSaveHref: string;
  privateNotes?: ManagerPrivateNote[];
  isManager: boolean;
  managerEmail?: string | null;
};

export function OneOnOneEditor({
  seatId,
  year,
  month,
  initialOneOnOne,
  afterSaveHref,
  privateNotes = [],
  isManager,
  managerEmail,
}: OneOnOneEditorProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(
    initialOneOnOne?.status ?? OneOnOneStatus.NotStarted,
  );
  const [agenda, setAgenda] = useState<TiptapDoc>(
    normalizeTiptapDoc(initialOneOnOne?.agenda ?? EMPTY_TIPTAP_DOC),
  );
  const [discussionNotes, setDiscussionNotes] = useState<TiptapDoc>(
    normalizeTiptapDoc(initialOneOnOne?.discussion_notes ?? EMPTY_TIPTAP_DOC),
  );
  const [privateNoteBody, setPrivateNoteBody] = useState<TiptapDoc>(EMPTY_TIPTAP_DOC);

  const saveOneOnOne = async (nextStatus?: OneOnOneStatus) => {
    setSaving(true);
    const statusToSave = isManager
      ? nextStatus ??
        (status === OneOnOneStatus.Completed
          ? OneOnOneStatus.Completed
          : OneOnOneStatus.Draft)
      : initialOneOnOne?.status ?? OneOnOneStatus.NotStarted;
    const payload = {
      seat_id: seatId,
      year,
      month,
      agenda,
      discussion_notes: isManager ? discussionNotes : initialOneOnOne?.discussion_notes ?? EMPTY_TIPTAP_DOC,
      status: statusToSave,
    };

    const { error } = await supabase
      .from(DatabaseTable.OneOnOnes)
      .upsert(payload, {
        onConflict: "seat_id,year,month",
      });

    setSaving(false);

    if (error) {
      toast({
        title: "Could not save 1:1",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setStatus(statusToSave);
    toast({
      title:
        statusToSave === OneOnOneStatus.Completed
          ? "1:1 completed"
          : "1:1 saved",
    });
    router.push(afterSaveHref);
    router.refresh();
  };

  const savePrivateNote = async () => {
    if (!isManager || !managerEmail) return;

    setSaving(true);
    const { error } = await supabase.from(DatabaseTable.ManagerPrivateNotes).insert({
      seat_id: seatId,
      author_email: managerEmail,
      body: privateNoteBody,
      linked_one_on_one_id: initialOneOnOne?.id ?? null,
    });
    setSaving(false);

    if (error) {
      toast({
        title: "Could not save private note",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setPrivateNoteBody(EMPTY_TIPTAP_DOC);
    toast({
      title: "Private note saved",
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <PeopleSection
          title="Agenda"
          description="Employee-owned agenda for this month."
        >
          <RichTextEditor
            value={agenda}
            onChange={setAgenda}
            placeholder="Add agenda items..."
          />
        </PeopleSection>

        <PeopleSection
          title="Discussion notes"
          description={isManager ? "Shared manager notes visible to the employee." : "Shared notes from the manager."}
        >
          <RichTextEditor
            value={discussionNotes}
            onChange={setDiscussionNotes}
            editable={isManager}
            placeholder="Capture discussion notes..."
          />
        </PeopleSection>

        <div className="sticky bottom-24 z-10 flex justify-end lg:static">
          <div className="flex flex-wrap justify-end gap-2">
            {isManager && status !== OneOnOneStatus.Completed && (
              <Button
                type="button"
                variant="outline"
                onClick={() => saveOneOnOne(OneOnOneStatus.Completed)}
                disabled={saving}
                className="h-11 rounded-full px-5"
              >
                {saving ? "Saving..." : "Mark complete"}
              </Button>
            )}
            <Button
              type="button"
              onClick={() => saveOneOnOne()}
              disabled={saving}
              className="h-11 rounded-full px-5"
            >
              {saving ? "Saving..." : "Save 1:1"}
            </Button>
          </div>
        </div>
      </div>

      {isManager && (
        <aside className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Private
            </p>
            <h2 className="mt-1 text-base font-semibold text-gray-950">
              Manager notes
            </h2>
          </div>
          <RichTextEditor
            value={privateNoteBody}
            onChange={setPrivateNoteBody}
            placeholder="Add private context..."
            className="border-amber-200"
          />
          <Button
            type="button"
            variant="outline"
            onClick={savePrivateNote}
            disabled={saving}
            className="w-full rounded-full border-amber-200 bg-white"
          >
            Save private note
          </Button>
          <div className="space-y-3">
            {privateNotes.map((note) => (
              <div
                key={note.id}
                className="rounded-md border border-amber-200 bg-white p-3 text-sm text-gray-600"
              >
                <RichTextEditor
                  value={normalizeTiptapDoc(note.body)}
                  onChange={() => undefined}
                  editable={false}
                />
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
