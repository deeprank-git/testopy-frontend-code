import { describe, it, expect } from "vitest";
import { examPageLinks, usableLink } from "./exam-links";

describe("usableLink", () => {
  it.each([
    ["https://ssc.gov.in/", "https://ssc.gov.in/"],
    ["  http://ibps.in  ", "http://ibps.in"],
    ["/uploads/notificationPDF/a.pdf", "/uploads/notificationPDF/a.pdf"],
  ])("keeps %j", (value, expected) => {
    expect(usableLink(value)).toBe(expected);
  });

  it.each(["", "   ", "#", "//evil.example", "javascript:alert(1)", "ssc.gov.in", undefined, null, 42])(
    "drops %j",
    (value) => {
      expect(usableLink(value)).toBeUndefined();
    },
  );
});

describe("examPageLinks", () => {
  it("includes only the links an exam actually has", () => {
    expect(examPageLinks({ officialWebsite: "https://ssc.gov.in/", applyLink: "" }, undefined)).toEqual({
      officialWebsite: "https://ssc.gov.in/",
    });
    expect(
      examPageLinks(
        { officialWebsite: "", applyLink: "https://ssc.gov.in/login" },
        "http://localhost:5000/uploads/notificationPDF/a.pdf",
      ),
    ).toEqual({
      applyLink: "https://ssc.gov.in/login",
      notificationPdf: "http://localhost:5000/uploads/notificationPDF/a.pdf",
    });
    expect(examPageLinks(undefined, undefined)).toEqual({});
  });
});
