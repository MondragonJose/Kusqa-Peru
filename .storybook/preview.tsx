import type { Preview } from "@storybook/tanstack-react";
import { withProviders } from "./decorators";
import "../src/styles.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      config: {
        rules: [{ id: "color-contrast", enabled: false }],
      },
    },
  },
  decorators: [withProviders],
};

export default preview;
