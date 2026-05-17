"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  AssignmentFields,
  type AssignmentValue,
} from "@/components/phone-numbers/assignment-fields";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createPhoneNumber,
  type CreatePhoneNumberInput,
} from "@/lib/phone-numbers/phone-numbers-api";

const DEFAULT_ASSIGNMENT: AssignmentValue = {
  mode: "none",
  agentId: "",
  workflowId: "",
};

function assignmentPayload(
  a: AssignmentValue,
): Pick<CreatePhoneNumberInput, "assignAgentId" | "assignWorkflowId"> {
  if (a.mode === "agent" && a.agentId) return { assignAgentId: a.agentId };
  if (a.mode === "workflow" && a.workflowId) return { assignWorkflowId: a.workflowId };
  return {};
}

export function AddPhoneNumberDialog({
  open,
  onOpenChange,
  onCreated,
  initialAgentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  initialAgentId?: string;
}) {
  const [tab, setTab] = React.useState("vapi");
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState("");
  const [areaCode, setAreaCode] = React.useState("");
  const [number, setNumber] = React.useState("");
  const [twilioSid, setTwilioSid] = React.useState("");
  const [twilioToken, setTwilioToken] = React.useState("");
  const [credentialId, setCredentialId] = React.useState("");
  const [sipUri, setSipUri] = React.useState("");
  const [assignment, setAssignment] = React.useState<AssignmentValue>(() =>
    initialAgentId
      ? { mode: "agent", agentId: initialAgentId, workflowId: "" }
      : DEFAULT_ASSIGNMENT,
  );

  const reset = () => {
    setName("");
    setAreaCode("");
    setNumber("");
    setTwilioSid("");
    setTwilioToken("");
    setCredentialId("");
    setSipUri("");
    setAssignment(
      initialAgentId
        ? { mode: "agent", agentId: initialAgentId, workflowId: "" }
        : DEFAULT_ASSIGNMENT,
    );
    setTab("vapi");
  };

  async function submit(provider: CreatePhoneNumberInput["provider"]) {
    setBusy(true);
    try {
      const base: CreatePhoneNumberInput = {
        provider,
        name: name.trim() || undefined,
        ...assignmentPayload(assignment),
      };
      if (provider === "vapi") {
        await createPhoneNumber({ ...base, areaCode: areaCode.trim() });
      } else if (provider === "twilio") {
        await createPhoneNumber({
          ...base,
          number: number.trim(),
          twilioAccountSid: twilioSid.trim(),
          twilioAuthToken: twilioToken.trim(),
        });
      } else if (provider === "vonage" || provider === "telnyx") {
        await createPhoneNumber({
          ...base,
          number: number.trim(),
          credentialId: credentialId.trim(),
        });
      } else {
        await createPhoneNumber({
          ...base,
          sipUri: sipUri.trim(),
          number: number.trim() || undefined,
        });
      }
      toast.success("Phone number added");
      onOpenChange(false);
      reset();
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add phone number");
    } finally {
      setBusy(false);
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add phone number</DialogTitle>
          <DialogDescription>
            Get a new line or connect a number you already own. Incoming calls can
            go to an agent or workflow.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="vapi" className="flex-1 text-xs">
              Get a new number
            </TabsTrigger>
            <TabsTrigger value="twilio" className="flex-1 text-xs">
              Connect Twilio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vapi" className="grid gap-4 pt-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Friendly name (optional)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Support line"
                className="h-9 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">US area code</Label>
              <Input
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="415"
                className="h-9 text-sm"
              />
              <p className="text-muted-foreground text-[11px]">
                We will provision a number in this area when available.
              </p>
            </div>
            <AssignmentFields value={assignment} onChange={setAssignment} disabled={busy} />
            <Button type="button" disabled={busy || areaCode.length < 3} onClick={() => void submit("vapi")}>
              {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Get number
            </Button>
          </TabsContent>

          <TabsContent value="twilio" className="grid gap-4 pt-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Friendly name (optional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Your Twilio phone number</Label>
              <Input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="+14155551234"
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Twilio Account SID</Label>
              <Input value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} className="h-9 text-sm font-mono" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Twilio Auth Token</Label>
              <Input
                type="password"
                value={twilioToken}
                onChange={(e) => setTwilioToken(e.target.value)}
                className="h-9 text-sm font-mono"
              />
              <p className="text-muted-foreground text-[11px]">
                Sent securely to our voice provider. We never store it in your workspace.
              </p>
            </div>
            <AssignmentFields value={assignment} onChange={setAssignment} disabled={busy} />
            <Button type="button" disabled={busy} onClick={() => void submit("twilio")}>
              {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Connect Twilio number
            </Button>
          </TabsContent>
        </Tabs>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="w-full text-xs">
              More options (Vonage, Telnyx, SIP)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="grid gap-4 pt-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Provider credential ID</Label>
              <Input
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                placeholder="From your voice provider dashboard"
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Phone number (E.164)</Label>
              <Input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="+14155551234"
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">SIP URI (optional, for your own line)</Label>
              <Input
                value={sipUri}
                onChange={(e) => setSipUri(e.target.value)}
                placeholder="sip:user@provider.com"
                className="h-9 text-sm font-mono"
              />
            </div>
            <AssignmentFields value={assignment} onChange={setAssignment} disabled={busy} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void submit("vonage")}>
                Add Vonage
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void submit("telnyx")}>
                Add Telnyx
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void submit("byo")}>
                Add SIP line
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
