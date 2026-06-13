import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { InitiativeCard } from "../InitiativeCard";
import { makeInitiative, LIFECYCLE_META } from "@/features/actions/components/__stories__/initiativeFixtures";
import type { InitiativeLifecycle } from "@/domain/initiative";

const LIFECYCLES: InitiativeLifecycle[] = ["forming", "gathering", "active", "completed", "archived", "dormant"];

const meta = {
  title: "Features/Home/InitiativeCard",
  component: InitiativeCard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof InitiativeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initiative: makeInitiative({ lifecycle: "active" }),
  },
};

export const AllLifecycles: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {LIFECYCLES.map((lifecycle) => (
        <InitiativeCard
          key={lifecycle}
          initiative={makeInitiative(LIFECYCLE_META[lifecycle].overrides)}
        />
      ))}
    </div>
  ),
};

export const WithXP: Story = {
  args: {
    initiative: makeInitiative({ lifecycle: "active" }),
    xp: 150,
    spotsLeft: 5,
  },
};

export const FullSpots: Story = {
  args: {
    initiative: makeInitiative({ lifecycle: "active" }),
    xp: 100,
    spotsLeft: 0,
  },
};

export const ProposalCard: Story = {
  args: {
    initiative: makeInitiative(LIFECYCLE_META.forming.overrides),
  },
};
