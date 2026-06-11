import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { InitiativeActionBar } from "../InitiativeActionBar";
import { makeInitiative, LIFECYCLE_META } from "./initiativeFixtures";
import type { InitiativeLifecycle } from "@/domain/initiative";
import type { UserRelationship } from "@/domain/initiativeActions";

const LIFECYCLES: InitiativeLifecycle[] = ["forming", "gathering", "active", "completed", "dormant"];
const RELATIONSHIPS: UserRelationship[] = ["visitor", "supporter", "participant", "co_steward", "steward"];

const meta = {
  title: "Features/Actions/InitiativeActionBar",
  component: InitiativeActionBar,
  parameters: {
    layout: "padded",
    a11y: { disable: true },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof InitiativeActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initiative: makeInitiative({ lifecycle: "active" }),
    relationship: "visitor",
    onSupport: () => alert("Support!"),
    onJoin: () => alert("Join!"),
    onShare: () => alert("Share!"),
  },
};

export const AllLifecycles: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {LIFECYCLES.map((lifecycle) => (
        <div key={lifecycle} className="flex flex-col gap-2">
          <h3 className="text-sm font-mono text-muted-foreground">
            {LIFECYCLE_META[lifecycle].label}
          </h3>
          <InitiativeActionBar
            initiative={makeInitiative(LIFECYCLE_META[lifecycle].overrides)}
            relationship="visitor"
            onAction={(action) => console.log(action)}
          />
        </div>
      ))}
    </div>
  ),
};

export const AllRelationships: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {RELATIONSHIPS.map((rel) => (
        <div key={rel} className="flex flex-col gap-2">
          <h3 className="text-sm font-mono text-muted-foreground">relationship: {rel}</h3>
          <InitiativeActionBar
            initiative={makeInitiative({ lifecycle: "active" })}
            relationship={rel}
            onAction={(action) => console.log(action)}
          />
        </div>
      ))}
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(["row", "stack", "compact", "popup"] as const).map((variant) => (
        <div key={variant} className="flex flex-col gap-2">
          <h3 className="text-sm font-mono text-muted-foreground">variant: {variant}</h3>
          <InitiativeActionBar
            initiative={makeInitiative({ lifecycle: "active" })}
            relationship="visitor"
            variant={variant}
            onAction={(action) => console.log(action)}
          />
        </div>
      ))}
    </div>
  ),
};

export const Overflow: Story = {
  args: {
    initiative: makeInitiative({ lifecycle: "active" }),
    relationship: "visitor",
    maxVisible: 2,
    onAction: (action) => console.log(action),
  },
};

export const EmptyDormant: Story = {
  args: {
    initiative: makeInitiative({ lifecycle: "dormant" }),
    relationship: "visitor",
  },
};
