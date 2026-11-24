/**
 * Catalogue of backend modules derived from the legacy WorldTaker PHP analysis
 * (see documentation/migration-mapping.md). Each entry records which legacy PHP
 * files and database tables the module replaces, so nothing is lost in migration.
 *
 * `status`:
 *  - implemented: endpoints live in this codebase
 *  - planned:     folder + README exist; endpoints not yet built
 */
export type ModuleStatus = 'implemented' | 'planned';

export interface ModuleDefinition {
  /** Feature name and Swagger tag. */
  name: string;
  /** Mount path relative to /api/v1. */
  basePath: string;
  status: ModuleStatus;
  summary: string;
  legacyFiles: readonly string[];
  legacyTables: readonly string[];
}

export const MODULES = [
  {
    name: 'health',
    basePath: '/health',
    status: 'implemented',
    summary: 'Service liveness/readiness check (new; no legacy equivalent).',
    legacyFiles: [],
    legacyTables: [],
  },
  {
    name: 'auth',
    basePath: '/auth',
    status: 'implemented',
    summary:
      'Registration, email activation, login/logout, password reset, social sign-in (Google, Microsoft, Apple, Facebook, Twitter).',
    legacyFiles: [
      'login-account.php',
      'logout.php',
      'register-new-account.php',
      'homeregister_submit.php',
      'check_reg.php',
      'account-activation.php',
      'forgot-mpassword.php',
      'mpassword-recover.php',
      'user-check/email-register-duplicate.php',
      'social-login.php',
      'social-login-config.php',
      'apple-login.php',
      'microsoft-login.php',
      'login-from-social-media.php',
      'facebook-php-sdk/*',
    ],
    legacyTables: ['user', 'user_tmp', 'user_activation', 'password_request', 'user_social_login'],
  },
  {
    name: 'users',
    basePath: '/users',
    status: 'implemented',
    summary:
      'Own account settings (email + password via /auth/change-password) and the full member profile — personal details, primary/secondary locations, visited countries and currently visiting countries — under GET/PUT /users/me/profile.',
    legacyFiles: [
      'user-save.php?q=account|profile|location',
      'include/user-account.php',
      'include/user-profile.php',
      'include/user-location.php',
      'include/user-visited_country.php',
      'include/user-visiting_country.php',
      'user-check/user-account.php',
      'user-check/visited_country.php',
      'user-check/visiting_country.php',
      'user-check/username-duplicate.php',
      'user-check/old_password-check.php',
    ],
    legacyTables: [
      'user',
      'user_tmp',
      'user_country_visited',
      'user_visiting_country',
      'race',
      'height',
      'education_level',
      'countries',
      'country_states',
    ],
  },
  {
    name: 'profiles',
    basePath: '/profiles',
    status: 'planned',
    summary:
      'Public member profile pages (view another member by id/username). Self-service profile editing lives under /users/me/profile.',
    legacyFiles: [
      'users.php',
      'include/user-home.php',
      'php/php.inc.php#get_member_profile',
    ],
    legacyTables: [
      'user',
      'race',
      'height',
      'education_level',
      'general',
      'countries',
      'country_states',
      'country_state_cities',
      'timezones',
    ],
  },
  {
    name: 'media',
    basePath: '/media',
    status: 'planned',
    summary:
      'Profile photo gallery (up to 14), avatar and profile image selection, YouTube video ids, background music (MP3) upload.',
    legacyFiles: [
      'user-check/photo.php',
      'include/user-photo.php',
      'include/user-video.php',
      'user-check/background.php',
      'user-check/user-background.php',
      'include/user-background.php',
      'php/php.inc.php#get_member_image',
    ],
    legacyTables: ['user_photo', 'user'],
  },
  {
    name: 'discovery',
    basePath: '/discovery',
    status: 'planned',
    summary:
      'Member search (sex, country/state, age, ethnicity, religion, US zip radius), online members, members who visited a country, newest members, today’s birthdays, birthday twins.',
    legacyFiles: [
      'search.php',
      'search-check.php',
      'include/zipcode.class.php',
      'php/php.inc.php#get_online_members',
      'view/front_new_members.php',
      'view/front_member_birthdays.php',
      'view/member_by_con.php',
      'user-friends-bday.php',
    ],
    legacyTables: [
      'user',
      'zip_code',
      'countries',
      'country_states',
      'user_country_visited',
      'online_users',
    ],
  },
  {
    name: 'likes',
    basePath: '/likes',
    status: 'planned',
    summary: 'One-directional profile likes; liked member is notified by email.',
    legacyFiles: ['ajax/user-like.php'],
    legacyTables: ['user_like'],
  },
  {
    name: 'favorites',
    basePath: '/favorites',
    status: 'planned',
    summary: 'Private bookmark list of other members.',
    legacyFiles: ['ajax/user-favorite.php', 'favorites.php'],
    legacyTables: ['favorites'],
  },
  {
    name: 'friends',
    basePath: '/friends',
    status: 'planned',
    summary: 'Friend requests (send/accept/decline), friend list with online status, unfriend.',
    legacyFiles: [
      'add-friend.php',
      'accept-friend.php',
      'friends.php',
      'friends-requests.php',
      'view/get-friends-request.php',
      'view/get-online-friends.php',
      'php/php.inc.php#get_friends|get_online_friends',
    ],
    legacyTables: ['friend_request', 'user.friends (CSV column)'],
  },
  {
    name: 'messages',
    basePath: '/messages',
    status: 'planned',
    summary:
      'Asynchronous private messages (subject + body) with per-side read/delete flags; inbox and threads.',
    legacyFiles: ['message.php', 'common/message.php', 'user-check/message.php'],
    legacyTables: ['email'],
  },
  {
    name: 'chat',
    basePath: '/chat',
    status: 'planned',
    summary:
      'Real-time one-to-one text chat with smilies (legacy: AJAX polling). Will move to WebSockets (src/realtime).',
    legacyFiles: ['chat.php', 'ajax/chat-script_page.php', 'js/chat-functions.js'],
    legacyTables: ['chat', 'smilies'],
  },
  {
    name: 'video-calls',
    basePath: '/video-calls',
    status: 'planned',
    summary:
      'One-to-one video call invitations and meeting lifecycle (Join → Expired) via VideoSDK.live.',
    legacyFiles: [
      'video_chat.php',
      'video-call.php (incoming call list)',
      'common/video_chat.php',
      'notify.php',
      'polling.php',
      'update_status.php',
      'check_meeting_status.php',
      'notify_leave.php',
      'cancel_meeting.php',
      'webcam/start-chat.php (legacy Flash)',
      'ajax/updateStratus.php (legacy Flash)',
      'php/signaling.php (unused WebRTC prototype)',
    ],
    legacyTables: ['video_chat', 'chat (msg=webcam rows)'],
  },
  {
    name: 'presence',
    basePath: '/presence',
    status: 'planned',
    summary:
      'Online/offline status and visitor/member counters (legacy: 5-minute activity window).',
    legacyFiles: ['php/php.inc.php#online_user_check', 'php/php.inc.php#get_online_users'],
    legacyTables: ['online_users'],
  },
  {
    name: 'notifications',
    basePath: '/notifications',
    status: 'planned',
    summary:
      'Header badge counts (unread messages, pending video invites, friend requests) and transactional/birthday emails. No legacy notifications table exists.',
    legacyFiles: ['header.inc.php', 'mailer.php', 'cron.php', 'user-bday-card.php'],
    legacyTables: ['email', 'video_chat', 'friend_request'],
  },
  {
    name: 'travel',
    basePath: '/travel',
    status: 'planned',
    summary: 'Countries/states a member has visited and up to two countries they plan to visit.',
    legacyFiles: [
      'user-check/visited_country.php',
      'user-check/visiting_country.php',
      'include/user-visited_country.php',
      'include/user-visiting_country.php',
    ],
    legacyTables: ['user_country_visited', 'user_visiting_country'],
  },
  {
    name: 'posts',
    basePath: '/posts',
    status: 'implemented',
    summary: 'Travel posts with one image + comments. Owner-or-admin edit/delete; auto reading-time.',
    legacyFiles: ['user-posts1.php', 'user-posts-add.php', 'user-posts-details.php'],
    legacyTables: ['user_posts', 'user_posts_comments', 'posts', 'post_comments'],
  },
  {
    name: 'blog',
    basePath: '/blog',
    status: 'planned',
    summary: 'Admin-authored blog posts with member comments.',
    legacyFiles: ['blog.php', 'wt/blog_post.php', 'wt/comments.php'],
    legacyTables: ['blog', 'blog_comments'],
  },
  {
    name: 'content',
    basePath: '/content',
    status: 'planned',
    summary: 'CMS pages/nodes (About, Terms, Privacy, ...), menus and URL aliases.',
    legacyFiles: [
      'index.php',
      'page.tpl.php',
      'node.tpl.php',
      'php/php.inc.php#url_alias',
      'wt/node.php',
      'wt/page.php',
      'wt/menu.php',
      'wt/url_alias.php',
    ],
    legacyTables: ['node', 'node_type', 'page', 'menu', 'url_alias', 'worldclock'],
  },
  {
    name: 'contact',
    basePath: '/contact',
    status: 'planned',
    summary: 'Public contact form (reCAPTCHA + honeypot) emailed to site admin.',
    legacyFiles: ['contact-by-message.php', 'about-us.php', 'wt/contact.php'],
    legacyTables: ['contact'],
  },
  {
    name: 'connections',
    basePath: '/connections',
    status: 'implemented',
    summary:
      'Member–Guide connection requests — send (both directions), accept/decline, list with filters. An accepted connection is the gate for future chat.',
    legacyFiles: [],
    legacyTables: ['connections'],
  },
  {
    name: 'guides',
    basePath: '/guides',
    status: 'implemented',
    summary:
      'Guide self-service profile — view/upsert own profile (headline, areas, languages, rates, preferences), cover photo upload. verification/profile status backend-managed.',
    legacyFiles: [],
    legacyTables: ['guide_profiles'],
  },
  {
    name: 'reference-data',
    basePath: '/reference',
    status: 'implemented',
    summary:
      'Read-only lookups for profile/registration forms: countries, states by country, race, height, education, religion, marital status, sex, lifestyle traits and looking-to-meet options.',
    legacyFiles: [
      'get_states.php',
      'get_cities.php',
      'timezoneset.php',
      'php/php.inc.php#get_countries*',
    ],
    legacyTables: [
      'countries',
      'country_states',
      'country_state_cities',
      'zip_code',
      'timezones',
      'race',
      'height',
      'education_level',
      'general',
    ],
  },
  {
    name: 'admin',
    basePath: '/admin',
    status: 'planned',
    summary:
      'Administration (legacy /wt/): member suspend/delete/restore/purge, pending-member activation, CMS, blog, lookups, geo data, bulk email, contact inbox.',
    legacyFiles: [
      'wt/*.php',
      'wt/common/more_action.php',
      'wt/common/save.php',
      'wt/include/*.php',
    ],
    legacyTables: ['all'],
  },
] as const satisfies readonly ModuleDefinition[];

export type ModuleName = (typeof MODULES)[number]['name'];
