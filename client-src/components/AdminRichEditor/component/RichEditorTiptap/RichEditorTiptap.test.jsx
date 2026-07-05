/** @jest-environment jsdom */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RichEditorTiptap from "./index";

describe("RichEditorTiptap", () => {
  it("renders the given HTML value", () => {
    render(<RichEditorTiptap value="<p>Some content</p>" onChange={() => {}} />);

    expect(screen.getByText("Some content")).toBeInTheDocument();
  });

  it("opens the media dialog and inserts an image URL, calling onChange with it included", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <RichEditorTiptap
        value="<p>Some content</p>"
        onChange={onChange}
        extra={{ publicBucketUrl: "https://cdn.example.com", folderName: "items/1" }}
      />
    );

    const imageButton = screen.getByRole("button", { name: /^image$/i });
    await user.click(imageButton);

    const urlModeRadio = screen.getByRole("radio", { name: /from url/i });
    await user.click(urlModeRadio);

    const urlInput = screen.getByPlaceholderText(/example\.com/i);
    await user.type(urlInput, "https://example.com/photo.jpg");

    const insertButton = screen.getByRole("button", { name: /insert/i });
    await user.click(insertButton);

    await waitFor(() => {
      const found = onChange.mock.calls.some(
        (call) => typeof call[0] === "string" && call[0].includes("https://example.com/photo.jpg")
      );
      expect(found).toBe(true);
    });
  });
});
