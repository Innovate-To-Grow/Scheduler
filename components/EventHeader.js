"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { MdCheck, MdLink } from "react-icons/md";
import AppButton from "@/components/AppButton";

function EventHeader({ eventName, eventCode }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/event?code=${eventCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="event-header">
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        <Image
          src="/img/i2glogo.png"
          alt="i2G Logo"
          width={36}
          height={36}
          style={{ flexShrink: 0 }}
        />
        <h1
          style={{
            margin: 0,
            fontSize: "1.2rem",
            color: "var(--md-sys-color-primary)",
            fontWeight: "600",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {eventName}
        </h1>
      </Link>
      <AppButton onClick={handleCopy} variant="outlined" icon={copied ? <MdCheck /> : <MdLink />}>
        {copied ? "Copied!" : "Copy Share Link"}
      </AppButton>
    </div>
  );
}

export default EventHeader;
