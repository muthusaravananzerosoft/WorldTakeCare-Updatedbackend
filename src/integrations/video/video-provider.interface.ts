/**
 * One-to-one video calls. Legacy used VideoSDK.live prebuilt RTC
 * (video_chat.php); the older Flash/ScriptCam path is obsolete and dropped.
 */
export interface VideoMeeting {
  meetingId: string;
  url?: string;
}

export interface VideoProvider {
  createMeeting(): Promise<VideoMeeting>;
  /** Token authorising one member to join one meeting. */
  createToken(userId: number, meetingId: string): Promise<string>;
}
