/** @jest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminRichEditor from "./index";

describe("AdminRichEditor", () => {
  it("renders the given HTML value inside the rich editor", () => {
    render(
      <AdminRichEditor
        value="<p>Hello world</p>"
        onChange={() => {}}
        extra={{ publicBucketUrl: "https://cdn.example.com", folderName: "items/1" }}
      />
    );

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("fires onChange with updated HTML when a toolbar action (bold) is clicked", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <AdminRichEditor
        value="<p>Hello world</p>"
        onChange={onChange}
        extra={{ publicBucketUrl: "https://cdn.example.com", folderName: "items/1" }}
      />
    );

    const editable = document.querySelector('[contenteditable="true"]');
    editable.focus();
    const range = document.createRange();
    range.selectNodeContents(editable);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    const boldButton = screen.getByRole("button", { name: /bold/i });
    await user.click(boldButton);

    expect(onChange).toHaveBeenCalled();
    const lastCallArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(typeof lastCallArg).toBe("string");
  });

  it("switches to html source mode and calls onChange with raw textarea edits", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <AdminRichEditor
        value="<p>Hello world</p>"
        onChange={onChange}
        extra={{ publicBucketUrl: "https://cdn.example.com", folderName: "items/1" }}
      />
    );

    const htmlModeRadio = screen.getByRole("radio", { name: /html source/i });
    await user.click(htmlModeRadio);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "!");

    expect(onChange).toHaveBeenCalled();
  });
});
