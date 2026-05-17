# MILLAT UMIDI UNIVERSITY
Faculty of Information Technologies
60610600 - Software Engineering
BACHELOR DEGREE THESIS
```
TALENTFLOW: AI-ASSISTED PLATFORM FOR SECURE
```
ACADEMIC TESTING AND RECRUITMENT
Role Information
Student Shokirov Abdulfayz
Scientific supervisor ________________________
Reviewer ________________________
Project type Web application backend andadministration platform
Tashkent - 2026
ABSTRACT
This bachelor thesis presents the design and implementation of TalentFlow, a
web platform for secure academic testing and recruitment-oriented assessment.
The project is based on a practical institutional problem: universities and
companies need digital evaluation tools, but ordinary online forms and open quiz
links do not provide enough control over identity, invitation, session state, result
storage, and administrative accountability. TalentFlow approaches this problem as
a backend and admin-workflow system rather than only as a candidate-facing test
page.
The platform uses FastAPI, PostgreSQL, SQLAlchemy, JWT authentication,
role-based access control, email invitations, WebSocket-based live testing,
question banks, practice assignments, candidate records, vacancies, and an
adaptive difficulty mechanism. Administrators can create users, bulk invite
students, create vacancies, prepare questions, assemble practices, assign
assessments to individuals or groups, send credentials, and review statistics.
Candidates can access a test only when a server-side assignment exists. During the
test, the WebSocket endpoint checks the token, creates a session, delivers
questions, stores answers, calculates score, prevents repeated entry, and locks
completed assignments.
The thesis is organized according to the academic requirements for a
graduation project. Chapter 1 studies the relevance of secure online assessment, the
situation of digital transformation in Uzbekistan, existing platform types, and the
formal statement of the problem. Chapter 2 explains the technologies, alternatives,
computer requirements, database server needs, frameworks, libraries, algorithms,
and implementation mechanisms. Chapter 3 describes the completed system,
database structure, admin panel, candidate workflow, WebSocket design,
functional capabilities, security issues, testing strategy, and future improvements.
```
Images are not embedded in the document; instead, clear Nano Banana prompts are
```
provided where diagrams or screenshots can later be generated.
2
Table 1. Thesis keywords
Keyword Description
TalentFlow Secure assessment and recruitment webplatform
FastAPI Python web framework used for RESTand WebSocket endpoints
PostgreSQL Relational database used for users,assignments, tests, and results
Admin panel Control layer for vacancies, students,questions, assessments, invitations, and statistics
WebSocket Real-time channel for test sessions andanswer submission
Adaptive difficulty Formula-based recalculation of questiondifficulty using failure rate and time spent
3
TABLE OF CONTENTS
INTRODUCTION
CHAPTER 1. RELEVANCE AND PROBLEM ANALYSIS OF SECURE
DIGITAL ASSESSMENT
1.1 Relevance of the Topic and Situation in Uzbekistan
1.2 Existing Systems, Types, Opportunities, Tasks, and Limitations
1.3 Problem Statement
CHAPTER 2. TECHNOLOGIES, REQUIREMENTS, AND DEVELOPMENT
METHODS
2.1 Technology Choice and Comparison with Alternatives
2.2 Development Environment, Computer Requirements, and Database Server
2.3 Methodologies, Algorithms, Security Mechanisms, and Models
2.4 Frameworks, Libraries, and Practical Usage Instructions
CHAPTER 3. IMPLEMENTATION OF THE TALENTFLOW PLATFORM
3.1 System Architecture and Database Structure
3.2 Admin Panel: Vacancies, Users, Tests, Invitations, and Statistics
3.3 Candidate/User Panel and Invitation-Only Testing Workflow
3.4 WebSocket Testing Module and Adaptive Scoring
3.5 Functional Capabilities, Testing, Limitations, and Future Development
CONCLUSION
REFERENCES
APPLICATIONS
4
INTRODUCTION
Digital platforms have become a normal part of education and employment.
Universities use online systems for learning materials, assignments, quizzes,
independent work, entrance preparation, and distance communication with
students. Companies use recruitment platforms to publish vacancies, collect
resumes, filter candidates, and organize early-stage tests before interviews. These
processes save time and make services more accessible, but they also create a
serious trust problem. A result obtained through an online test is valuable only if
the institution can prove that the correct person received the correct assignment,
answered inside a controlled session, and could not access a test without
permission.
The relevance of this thesis is connected with the digital development of
Uzbekistan and the increasing need for reliable educational technology. National
digital transformation programs emphasize the introduction of modern information
technologies in public services, education, science, and the economy. In practice,
universities and private educational organizations need tools that can support mass
testing, group-based invitations, administrative monitoring, and secure result
collection. A simple public test link is not enough for such a task, because it can be
forwarded to outsiders, opened by a person who was not invited, or repeated many
times without institutional control.
The project described in this thesis is TalentFlow, a web platform for secure
academic testing and recruitment-oriented assessment. The system is designed for
two related environments. In a university, an administrator can create student
accounts, prepare questions, assemble an assessment, assign it to selected students
or groups, send login information, and monitor completion statistics. In a company,
an administrator can publish vacancies, collect candidates, use assessments for
screening, and connect candidate information with test results. The common idea is
that assessment should be controlled by server-side permissions and recorded as a
traceable process.
5
The object of the research is the process of organizing digital assessment and
candidate evaluation in educational and recruitment environments. The subject of
the research is the design and implementation of a backend system that combines
user management, admin workflows, invitation-only test access, WebSocket
testing, answer persistence, scoring, and adaptive question difficulty. The thesis
does not treat online testing as a visual frontend problem only. It studies the
backend logic that makes the system reliable.
The aim of the thesis is to develop and document a secure platform model
that allows administrators to create, assign, conduct, and monitor assessments for
invited users. To achieve this aim, several tasks are completed. First, the need for
secure online testing is analyzed in the context of education, recruitment, and
digital transformation. Second, existing platform types are reviewed to identify
what functions are useful and what gaps remain. Third, suitable technologies are
selected and compared with alternatives. Fourth, the database model and API
architecture are designed. Fifth, the admin panel logic is implemented for users,
vacancies, questions, practices, assignments, invitations, and statistics. Sixth, a
real-time WebSocket testing workflow is developed. Seventh, limitations, security
risks, and future improvements are evaluated.
1. Analyze the relevance of secure digital assessment for universities and
companies.
2. Define the problem of invitation-only test access and administrative control.
3. Choose technologies for backend development, data storage, authentication, and
real-time testing.
4. Design database entities for companies, users, vacancies, candidates, questions,
practices, assignments, sessions, and answers.
5. Implement admin workflows for student creation, bulk invitation, question
management, assessment assignment, and statistics.
6. Implement candidate testing through a server-controlled WebSocket session.
7. Evaluate security, scalability, limitations, and directions for future
improvement.
6
The research methods used in the thesis include comparative analysis,
system analysis, database modeling, modular backend design, API design,
security-oriented workflow analysis, and implementation-based evaluation.
Comparative analysis is used to study learning management systems, recruitment
tools, and testing platforms. System analysis is used to separate user roles, data
entities, workflows, and risks. Database modeling is used to describe relationships
between users, companies, vacancies, practices, questions, assignments, sessions,
and answers. Implementation-based evaluation is used because the project is not
```
only theoretical; it is connected to a working FastAPI backend.
```
The scientific novelty of the work is the combination of academic testing
and recruitment screening in one server-controlled platform model. Many systems
solve only one side of the problem. Learning management systems often focus on
courses and content, while recruitment systems often focus on vacancies and
resumes. TalentFlow connects these workflows through a shared assessment
engine, admin panel, invitation model, and result tracking. The practical novelty is
the treatment of the admin panel as a security component. The administrator is not
```
only a content editor; the administrator defines who exists in the system, who
```
receives credentials, who is assigned to a test, and who is allowed to start a session.
The practical significance of the work is that the platform can be adapted for
universities, training centers, and companies. A university administrator can invite
a large number of students to testing and send each student login data. A company
administrator can publish a vacancy, screen candidates, and use assessment results
as part of the hiring process. The platform also creates a foundation for future
features such as CSV import, richer analytics, written-answer scoring, plagiarism
detection, audit logs, and legally compliant proctoring.
This bachelor thesis consists of an Introduction, three chapters, a
Conclusion, References, and Applications. Chapter 1 explains the relevance of the
topic, the situation in Uzbekistan, existing solutions, and the problem statement.
Chapter 2 explains the technologies, alternatives, device requirements, database
7
server, frameworks, libraries, and algorithms needed to build the system. Chapter 3
describes the implemented TalentFlow platform, including architecture, database
structure, admin panel, candidate panel, WebSocket testing, security, testing,
limitations, and development roadmap. The main academic part is prepared in the
```
required 50-60 page format, planned as 56 pages excluding Applications; pages in
```
the Applications section are not counted as part of the main volume.
8
CHAPTER 1. RELEVANCE AND PROBLEM ANALYSIS OF
SECURE DIGITAL ASSESSMENT
1.1 Relevance of the Topic and Situation in Uzbekistan
Digital transformation is changing the way knowledge, skills, and
professional readiness are evaluated. In the past, most academic examinations were
organized in physical classrooms, with paper forms, human invigilators, and
manual result processing. Recruitment tests were often conducted after a candidate
had already passed several interview stages. These models are still useful, but they
are difficult to scale. When hundreds or thousands of students or applicants must
be evaluated, manual processes create delays, inconsistent grading, and heavy
administrative work.
Uzbekistan is actively developing digital infrastructure, electronic services,
and modern education systems. National development documents such as the
Uzbekistan-2030 strategy and Digital Uzbekistan-2030 emphasize modernization,
digital services, education, innovation, and the use of information technologies in
different sectors. In the context of higher education, this creates demand for
systems that can support remote or hybrid learning, digital assessment, student
analytics, and faster administrative communication. A modern university cannot
rely only on paper-based tools if it wants to test large groups efficiently and
maintain a useful digital history of student performance.
The same need appears in the labor market. Companies receive more
applications through online channels, especially for IT, finance, operations, sales,
and remote-work positions. A vacancy can attract many applicants with similar
resumes. Human recruiters cannot interview everyone deeply, and unstructured
resume review may become subjective. Digital assessment gives recruiters a way
to collect comparable evidence before interviews. However, this evidence must be
trustworthy. If candidates can share links, retake tests without permission, or use
another person's account, the result becomes weak.
9
A secure assessment platform is therefore important not because testing is
new, but because trust is difficult to preserve in digital environments. The platform
must know who the user is, which assessment the user is allowed to take, whether
the attempt already exists, how answers are stored, and when the attempt is
completed. These questions are not cosmetic. They define whether the institution
can defend the result. In universities, a test result may affect grades, scholarship
opportunities, certification, or access to future stages. In recruitment, a result may
affect who receives an interview and who is rejected.
In Uzbekistan's educational environment, many institutions have used
general-purpose tools such as messengers, cloud documents, learning management
systems, video calls, and simple online forms. These tools are useful for
communication and basic learning tasks, but they do not always provide a
complete controlled testing workflow. A public form link can be forwarded. A
spreadsheet of results may not show whether the respondent was invited. A
messenger-based invitation can be lost among other messages. Manual checking of
names and groups consumes administrator time and increases the probability of
errors.
The relevance of TalentFlow comes from this gap between digital
convenience and institutional control. The platform is not limited to displaying
questions. It manages the full chain: administrator creates or imports users, sends
credentials, creates questions, builds an assessment, assigns it to students or
candidates, verifies invitation status at test start, conducts the test through a live
server session, records answers, calculates scores, and allows the administrator to
review statistics. This turns testing into a controlled business process.
The issue is especially important for universities that need to invite a large
number of students to testing. In such cases, the administrator may need to create
accounts for all students in a group or faculty, send each student a username and
password, assign a practice test, and see who completed it. If this is done manually,
mistakes are common: one student may not receive the link, another may receive
10
the wrong test, and a third may forward credentials to someone else. A specialized
platform reduces these risks by making assignment and invitation part of the
backend model.
Secure assessment is also connected with fairness. Students who follow rules
should not be disadvantaged by others who access tests early, retake them, or use
uninvited accounts. Candidates who complete screening honestly should not
compete with people who manipulate the process. Fairness requires more than a
statement in exam rules. It requires technical restrictions. The database must
represent assignments, the API must enforce them, and the test session must be
locked when completed.
Another aspect of relevance is data. A paper test ends when the teacher
collects sheets. A digital platform can preserve useful history: which questions
were difficult, how long users spent, which students completed assignments, and
which vacancies attracted candidates. This history supports improvement. If many
students fail a question, the question may be too hard, unclear, or poorly taught. If
candidates from a vacancy perform consistently poorly in a skill category, the
company may need a different job description or training pipeline.
TalentFlow uses adaptive difficulty to demonstrate how collected data can
improve the question bank. The project does not claim to perform fully automated
artificial intelligence proctoring. Instead, it applies a transparent formula based on
failure rate and time spent. This is appropriate for a bachelor project because it is
explainable, testable, and connected directly to database records. It also avoids
exaggerated claims: the system uses AI-assisted ideas where they are implemented
and describes advanced proctoring as future work.
Table 2. Practical relevance of the TalentFlow platform
Need Situation Required PlatformResponse
11
Mass testing
Large groups of students
or applicants must be evaluated
in limited time.
Bulk user creation,
group assignment, invitation
delivery, and completion
statistics.
Trust
Open links and informal
sharing weaken the value of
digital tests.
Server-side
authentication, assignment
checks, and one-session rules.
Fairness
Honest users should not
be disadvantaged by
uncontrolled access.
Invitation-only
assessment and locked
completed sessions.
Administrative
efficiency
Manual account and test
management causes errors.
Admin panel for users,
questions, assessments, and
reports.
Improvement
Institutions need
evidence about question quality
and candidate readiness.
Stored answers, scores,
time data, and adaptive difficulty
updates.
The importance of the topic can be summarized through three connected
arguments. First, digital assessment is becoming necessary because education and
hiring are increasingly organized through online channels. Second, ordinary digital
tools do not automatically provide academic integrity or recruitment fairness.
Third, a specialized platform can combine administrative convenience with
technical restrictions. TalentFlow is built around this third argument.
The platform also reflects the current direction of software development in
Uzbekistan. Modern projects are expected to be web-based, scalable, integrated
with databases, secure enough for personal data, and suitable for real organizations.
A graduation project should therefore show not only that a student can write code,
but also that the student can identify a real institutional problem, select suitable
technologies, design a data model, and document implementation decisions.
TalentFlow provides this opportunity because it touches authentication, roles,
databases, APIs, real-time communication, email, and analytics.
The local context also changes the meaning of usability. In many
universities, the person responsible for organizing a test may not be a full-time
12
software engineer. The platform must therefore reduce technical complexity for
administrators. The admin should not need to write SQL queries, manually create
tokens, or edit database rows. Instead, the admin panel must expose understandable
operations such as create student, choose group, create practice, assign test, send
invitation, and view result. This requirement strongly influenced the design of the
admin API.
Another practical condition is the difference between official records and
actual communication channels. Student names, groups, and email addresses may
come from different spreadsheets or department lists. Some students may use
personal email, others institutional email. A real platform must be able to handle
this imperfect data without losing control. TalentFlow addresses the first version of
this problem through explicit fields for email and group name, generated
usernames, and a bulk creation response that separates created, existing, and failed
records.
The relevance of the project is also methodological. A teacher or HR
specialist does not only need a final score. They need a way to understand whether
the assessment design was successful. If a question is missed by almost everyone,
it may be a sign of high difficulty, unclear wording, or a topic that was not taught
well. If every candidate passes with the same score, the test may not distinguish
skill levels. By storing answer-level data and time spent, TalentFlow prepares the
foundation for analysis that is more useful than a simple pass/fail list.
1.2 Existing Systems, Types, Opportunities, Tasks, and Limitations
Existing digital assessment and recruitment tools can be divided into several
groups. The first group is learning management systems, such as Moodle, Canvas,
or Google Classroom-style environments. These systems are strong for course
materials, assignments, quizzes, teacher-student communication, and gradebooks.
They are widely known and can be useful in universities. However, they may be
too broad for a focused recruitment or invitation-based testing workflow. They also
13
often require configuration and institutional hosting that can be heavy for small
organizations.
The second group is form-based tools. They are simple, fast, and familiar. A
teacher can create questions, share a link, and export results. The weakness is that
form tools often treat access as link-based rather than assignment-based. They may
require additional manual work to confirm whether a respondent was invited,
whether the same person answered more than once, and whether the account
belongs to the correct student. For informal quizzes this is acceptable. For
controlled testing, it is insufficient.
The third group is dedicated testing platforms. These systems focus on
question banks, timed sessions, randomized question order, reports, and sometimes
proctoring. They are closer to the needs of secure assessment. Their limitation is
that they may not connect naturally with vacancies, candidate records, and
university-style bulk invitation workflows. Some are commercial products with
licensing costs, while others require technical setup that is not convenient for all
institutions.
The fourth group is recruitment platforms and applicant tracking systems.
These tools help companies publish vacancies, collect resumes, manage candidate
pipelines, and coordinate interviews. They are strong for HR process management,
but many of them do not include deep academic-style testing or secure assessment
sessions. If a company wants to test technical skills, it may need a separate testing
tool. This separation can cause fragmented data, because resume information is in
one platform and test results are in another.
TalentFlow is positioned between these groups. It does not try to replace a
full university learning management system, and it does not try to become a
complete enterprise HR suite. Instead, it focuses on the point where testing,
invitation, administration, and recruitment evidence meet. This makes the system
smaller, clearer, and more suitable for a bachelor project. The system's value comes
from connecting concrete workflows: create users, send credentials, assign tests,
14
run sessions, store answers, review results, and connect candidate records with
vacancies.
The main types of online assessment include multiple-choice quizzes,
written-answer exams, coding tasks, oral interviews, project submissions, and
adaptive tests. TalentFlow currently implements multiple-choice assessment with
weighted points and adaptive question difficulty. This is a practical starting point
because multiple-choice questions can be scored automatically and can be stored in
a structured database. Future versions can add written answers, rubric scoring,
code evaluation, or plagiarism checks.
Existing systems also show that security must be layered. No single
mechanism solves all problems. Login confirms account access, but not necessarily
test permission. Time limits help structure a session, but not identity. Proctoring
may discourage cheating, but it raises privacy and legal questions. Assignment
logic prevents uninvited access, but it should be combined with tokens, deadlines,
completed-session locks, and audit data. TalentFlow focuses on these backend
layers first.
A useful platform must also support administrative tasks. Teachers and
university admins need to search students, filter groups, create questions, edit
mistakes, assign assessments, and view who completed them. HR admins need to
view vacancies, candidates, statuses, and screening results. If the admin panel is
weak, the whole system becomes difficult to use. For this reason, the improved
TalentFlow admin panel is treated as a central part of the thesis.
Table 3. Existing platform types and TalentFlow response
System Type TypicalAdvantageTypicalLimitationTalentFlowDirection
Learning
management system
Course
management,
assignments,
gradebooks.
Too broad for
focused recruitment and
secure invitations.
Keep
assessment workflow
focused and
lightweight.
15
Online form Fast creationand easy sharing.
Link-based
access and weak
identity control.
Use
account-based
assignments instead of
open links.
Testing
platform
Question banks,
timers, reports.
May not
include vacancy and
candidate workflows.
Connect
assessments with users,
groups, vacancies, and
candidates.
Applicant
tracking system
Candidate
pipeline and resume
management.
Testing may be
separate or shallow.
Add testing
evidence to recruitment
records.
Proctoring
service
Monitoring and
deterrence.
Privacy
concerns and high
operational cost.
Leave advanced
proctoring for future
legally reviewed work.
The opportunities created by these systems are significant. Digital testing
can reduce printing cost, shorten grading time, support remote participation, collect
data for analytics, and allow repeated use of question banks. Recruitment systems
can reduce the time required to identify promising applicants. However, the
limitations are also important. If the system does not control access, the institution
may receive fast results that are not trustworthy. If the system is secure but too
difficult to operate, administrators may avoid using it.
The tasks of a secure assessment platform can therefore be described as
technical, administrative, and methodological. Technical tasks include
authentication, database modeling, endpoint design, WebSocket communication,
email delivery, and deployment configuration. Administrative tasks include user
creation, group management, test assignment, invitation sending, statistics, and
result review. Methodological tasks include fair question design, appropriate
scoring, limitation of repeated attempts, and transparent evaluation rules.
The essence of the problem is not only cheating prevention. It is the creation
of a controlled evidence chain. The system should show that a user was created by
an authorized administrator, the assessment was assigned to that user, the session
was started after authentication, answers were stored in relation to the session, the
16
score was calculated by server logic, and completion was recorded. This chain
allows the institution to trust the result more than it would trust an uncontrolled
online form.
One of the weaknesses of many small educational systems is that they are
built around a single action: show questions and collect answers. Such systems
may work in a classroom experiment, but they do not model the real
responsibilities of an institution. Before the test begins, somebody must define the
candidate list. During the test, the platform must know which attempt is active.
After the test, somebody must interpret results and handle disputes. TalentFlow is
designed around the whole lifecycle, not only the question page.
Existing systems also show that too much complexity can become a barrier.
A large LMS may contain course forums, attendance, gradebooks, file repositories,
calendars, and plugins. Those features are useful, but an organization that only
needs controlled tests for a specific group may prefer a smaller workflow.
TalentFlow deliberately keeps the main assessment model understandable: users,
questions, practices, assignments, sessions, and answers. This clarity helps both
development and academic defense.
Recruitment workflows add another dimension. A company may not need all
academic LMS features, but it does need evidence before interview decisions. The
platform should help answer questions such as: Did the candidate apply to this
vacancy? Did the candidate complete the assigned assessment? What score did the
candidate receive? What does the resume suggest about the candidate's
background? These questions require a connection between vacancy records,
candidate records, and assessment results.
Table 4. Stakeholders and platform support
Actor Typical Goal Pain Point TalentFlowSupport
17
University
admin
Invite groups
and monitor
completion.
Manual
invitations and
spreadsheet checking
are slow.
Bulk creation,
group assignment,
email invitations,
student statistics.
Teacher Evaluateknowledge fairly.
Open links can
be shared and results
may be hard to verify.
Assignment-onl
y access, sessions,
stored answers,
question difficulty data.
Student Receive clearaccess to assigned tests.
Confusing links
and unclear deadlines
reduce participation.
Assigned-test
list, deadline, duration,
result endpoint.
HR admin
Filter
candidates before
interviews.
Resume review
alone is subjective and
time-consuming.
Vacancy
records, candidate
status, tests,
resume-review
prototype.
System
developer
Maintain and
extend the platform.
Unstructured
code makes security
changes risky.
Routers,
schemas, models,
utilities, documented
workflow.
1.3 Problem Statement
Based on the analysis above, the main problem can be stated as follows:
educational institutions and companies need a web platform that can organize
secure, invitation-only assessment for large groups of users while also supporting
recruitment and administrative workflows. The platform must allow admins to
create users, create vacancies, create questions, assemble tests, assign tests to
selected users or groups, send login credentials and invitations, prevent uninvited
access, conduct real-time test sessions, store answers, calculate results, and provide
statistics.
The problem includes several subproblems. The first subproblem is role
separation. Ordinary users must not be able to create tests, see all candidates, or
assign assessments. Admins should manage users and tests within their
organization. Superadmins may need broader visibility. The second subproblem is
18
invitation security. A test should not be accessible only because someone knows
the URL. The server must check whether the authenticated user has an active
assignment. The third subproblem is reliable testing. A user should not be able to
restart the same assessment repeatedly after seeing questions.
The fourth subproblem is data modeling. Users, companies, vacancies,
candidates, questions, practices, assignments, test sessions, and answers are
related, but they are not the same entity. If the database is poorly designed, the
platform will become difficult to extend. For example, a question is part of a
question bank, a practice is a selected set of question identifiers, an assignment
connects a practice to a user, and a session records one attempt. Separating these
entities makes the system more understandable.
The fifth subproblem is administrator usability. A secure system is not
enough if it is difficult to operate. A university admin may need to invite a full
group of students quickly. Therefore, the system must support bulk user creation,
random password generation, email delivery, group names, search, filtering, and
student statistics. The admin panel is not an optional interface. It is the command
center of the platform.
The sixth subproblem is real-time state. During a test, the server should
know which session is active, which questions are already answered, what answer
was submitted, how many points were awarded, and whether the test is finished.
Traditional REST endpoints can support many operations, but WebSocket
communication is appropriate for a live testing loop because it keeps a stateful
channel between browser and server.
The seventh subproblem is responsible AI use. The project includes an
adaptive difficulty mechanism and a Gemini resume-review prototype. These
components must be described honestly. Adaptive difficulty is implemented as a
transparent formula, not as a mysterious black box. Resume review is useful for
recruitment support, but it should assist human decision-making rather than replace
19
it. The platform should not claim advanced proctoring until such features are
implemented and legally evaluated.
The expected result of solving the problem is a platform where an
administrator can manage assessments professionally and where candidates or
students can access only the tests assigned to them. The system should provide a
practical base for university testing and recruitment screening. It should also be
documented clearly enough that future developers can understand the architecture,
extend it, and improve security.
Table 5. Formal problem statement components
Problem Component Concrete Requirement Implemented / PlannedResponse
Role control
Only admins manage
users, questions, and
assignments.
JWT authentication and
admin dependency checks.
Invitation-only access Uninvited users must notstart tests.
PracticeAssignment
check before WebSocket test
start.
Mass student
onboarding
University admin should
invite many students.
Bulk user creation,
generated usernames/passwords,
group assignment, email
invitations.
Question management
Admin should
create/edit questions and
difficulty.
Question CRUD,
options normalization, manual
difficulty update, history.
Live testing
Candidate should
receive questions and submit
answers in a controlled session.
WebSocket actions:
start_test, get_question,
submit_answer, finish_test.
Result tracking Admin should reviewcompletion and score.
TestSession and
UserAnswer records plus
dashboard statistics.
Future growth
System should support
richer analytics and proctoring
later.
Modular routers,
database entities, and
documented roadmap.
20
Figure 1.1. Conceptual problem map
CHAPTER 2. TECHNOLOGIES, REQUIREMENTS, AND
DEVELOPMENT METHODS
2.1 Technology Choice and Comparison with Alternatives
The implementation of TalentFlow requires technologies that support API
development, authentication, database access, real-time communication, validation,
and future integration with AI services. The backend is developed with Python and
FastAPI. Python is suitable for educational and research projects because it has
clear syntax, strong library support, and wide use in web development, data
processing, and artificial intelligence. FastAPI is suitable because it supports
asynchronous endpoints, automatic OpenAPI documentation, dependency
injection, Pydantic validation, and WebSocket routes.
Alternative backend frameworks were considered. Django is a strong Python
framework with an integrated ORM, admin interface, authentication, and many
21
built-in tools. It is useful for large content-driven systems, but it can be heavier
when the project is primarily an API service and needs explicit router-level control.
Flask is lightweight and flexible, but it requires additional choices for validation,
documentation, authentication patterns, and WebSocket handling. Node.js with
Express or NestJS is also a good alternative, especially for JavaScript teams, but
Python was more suitable for this project because of its connection with AI, data
processing, and the existing codebase.
FastAPI provides a balanced solution. It is lighter than Django, more
structured than a minimal Flask application, and comfortable for writing both
REST endpoints and WebSocket handlers in one application. The automatic
documentation at `/docs` and `/redoc` is especially important for a graduation
project because it allows endpoints to be inspected and tested without writing
separate documentation for every request manually. This helps supervisors and
future developers understand the backend.
PostgreSQL is selected as the main database. The platform stores structured
```
entities with relationships: companies own users and vacancies; vacancies have
```
```
candidates; questions are grouped into practices; assignments connect users and
```
```
practices; sessions record attempts; answers belong to sessions. A relational
```
database is appropriate for such data because integrity matters. PostgreSQL also
supports UUID primary keys, JSON fields, arrays, transactions, indexes, and
reliable production deployment.
SQLAlchemy is used as the object-relational mapping layer. It allows the
code to represent tables as Python classes while still using relational database
concepts. This is useful because the developer can work with objects such as
`User`, `Practice`, and `TestSession`, while the database stores rows and
relationships. SQLAlchemy also makes it easier to build queries for admin
statistics, search, filtering, and result aggregation.
Pydantic is used for request and response schemas. It validates input data
and documents response shapes. This is important for admin endpoints because
22
incoming data can include optional usernames, generated passwords, UUID lists,
group names, question options, correct answer identifiers, deadlines, and invitation
settings. Without validation, the backend would need many manual checks and
would be more vulnerable to inconsistent data.
JWT is used for authentication. After login, the server creates an access
token that contains user identity information and an expiration time. Protected
endpoints verify the token and load the current user from the database. This
mechanism is appropriate for an API-driven web application because the same
token can be used by HTTP endpoints and, through a query parameter, by the
WebSocket testing endpoint. The token is also placed in a cookie for
browser-based requests.
WebSocket communication is selected for the live testing loop. REST is
suitable for ordinary operations such as creating users or listing questions. During a
live test, however, the client and server exchange a sequence of stateful events:
start the test, request the next question, submit an answer, receive result feedback,
and finish the assessment. WebSocket keeps a single connection open for this
process, which makes the workflow easier to model.
Email delivery is required because a university admin may need to invite
many students and send login information. SMTP is used as the practical delivery
mechanism. In production, credentials must be stored in environment variables.
The repository already includes an environment-driven mailer helper for admin
invitations. The older email verification router still contains legacy hardcoded
configuration and should be refactored before production.
Gemini API integration appears in the repository as a resume-review
prototype. It is not the core of the academic testing workflow, but it supports the
recruitment side of TalentFlow. The prototype can compare resume text with a job
description and return structured information such as match score, advantages,
disadvantages, education, experience, and skills. This must be treated as decision
support, not as an automatic hiring decision.
23
Table 6. Technology selection and alternatives
Technology Selected Tool Alternative Reason forSelection
Backend
framework FastAPI
Django, Flask,
Express, NestJS
Modern API
design, automatic docs,
dependency injection,
WebSocket support.
Language Python JavaScript/TypeScript, Java, C#
Readable
syntax, strong libraries,
AI/data ecosystem,
suitable for student
project.
Database PostgreSQL MySQL,SQLite, MongoDB
Relational
integrity, UUID
support, JSON/ARRAY
support, production
reliability.
ORM SQLAlchemy Django ORM,raw SQL, Prisma
Flexible Python
ORM and explicit
query control.
Validation Pydantic
Manual
validation,
Marshmallow
Type-based
request/response
models and FastAPI
integration.
Authentication JWT Server sessions,OAuth-only
Works for API
endpoints and
WebSocket token
verification.
Real-time
channel WebSocket Polling, SSE
Bidirectional
test-state exchange
during assessment.
The chosen architecture also supports incremental development. The
platform can begin as a backend API with documented endpoints, then connect to a
frontend admin dashboard, then add CSV imports, richer analytics, and more
advanced proctoring. The tools do not force all features to be built at once. This is
24
important for a graduation project because the system should be complete enough
to demonstrate value, but still realistic about future work.
A major reason for selecting these tools is transparency. Supervisors can
inspect the database models, route definitions, schemas, and WebSocket logic
directly. If a test is rejected because the user is not assigned, the reason is visible in
the code. If a question difficulty changes, the formula can be explained
mathematically. This transparency is better for academic defense than using a
closed external platform.
The choice of tools also supports separation between prototype and
production concerns. A prototype must show that the main idea works, but a
production system must also be maintainable. FastAPI allows the same codebase to
expose documentation, enforce request validation, and organize features by routers.
PostgreSQL gives the platform a path toward indexing, backups, and concurrent
access. SQLAlchemy keeps database operations inside the Python ecosystem while
preserving relational design. These choices make the project suitable for
demonstration now and improvement later.
Another important reason for choosing an API-first backend is frontend
flexibility. The same backend can support a React, Vue, mobile, or server-rendered
frontend because it exposes clear HTTP and WebSocket contracts. For a university,
the frontend can be designed as a dense admin dashboard. For candidates, it can be
a simpler assigned-test page. This separation is useful because the backend rules
remain the authority even if the visual interface changes.
The alternatives remain valuable in other contexts. Django would be a good
choice if the system needed a complete built-in admin site and server-rendered
templates. Node.js/NestJS would be strong for teams already standardized on
TypeScript. A managed testing product could be faster for a non-technical
organization. However, for this diploma project the selected stack gives the best
balance between implementation control, explainability, and future integration with
AI-related Python tools.
25
2.2 Development Environment, Computer Requirements, and Database
Server
To develop and run TalentFlow locally, the developer needs a computer
capable of running a Python backend, a PostgreSQL database, and a web browser.
The project is not resource-heavy because it is a backend API, but database
operations, dependency installation, and development server reloads require a
stable environment. The minimum practical configuration is a dual-core processor,
8 GB RAM, 5 GB free disk space, and a modern operating system such as
Windows 10/11, Ubuntu, or macOS. For more comfortable development, 16 GB
RAM and an SSD are recommended.
The software requirements include Python 3.10 or newer, pip or another
Python package manager, PostgreSQL, Git, a code editor such as Visual Studio
Code, and an API testing tool or browser access to FastAPI documentation. For
deployment, the server should provide HTTPS, environment variable
configuration, a process manager, and database backups. If the frontend is
deployed separately, CORS origins must be configured carefully.
PostgreSQL is the recommended database server. The application models
use PostgreSQL-specific features such as UUID and ARRAY fields. Although the
repository contains an old SQLite test database, SQLite should not be considered
the production source of truth. SQLite is useful for small experiments, but it does
not match the current model set and does not provide the same production behavior
as PostgreSQL. Using PostgreSQL during development avoids surprises during
deployment.
The database server should be created with a dedicated user and password.
The application receives the connection string through `DATABASE_URL`. This
value includes the database driver, username, password, host, port, and database
name. Because this string can expose the entire platform database, it must never be
committed to a public repository. If a database URL has already been published,
the password should be rotated and the old credentials should be revoked.
26
The backend should be installed inside a virtual environment. A virtual
environment separates project dependencies from the system Python installation.
This prevents version conflicts and makes the setup more reproducible. After
creating the virtual environment, the developer installs packages from
`requirements.txt`, configures environment variables, and starts the app with
Uvicorn. The development server then exposes the API at `http://127.0.0.1:8000`.
The admin and testing workflows also depend on email settings. For Gmail
SMTP, a normal account password should not be used. Instead, an app password
should be generated from a Google account with two-factor authentication. The
mailer needs SMTP server, port, login, app password, and sender email. If these
values are wrong, invitation emails will fail even though the rest of the API works
correctly.
The project should use a separate environment for production. Production
settings must include a strong JWT secret, secure cookie configuration, HTTPS,
WSS for WebSocket, restricted CORS origins, database backups, and logging
policies that do not expose tokens. Development settings may be more permissive,
but production settings must treat credentials and student data as sensitive.
The minimum database server for a small university pilot can run on the
same machine as the backend if the number of concurrent users is low. For a real
testing day with many simultaneous students, the database should be hosted
separately or on a stronger server. CPU is less important than stable memory, disk
performance, and network reliability. A test platform should not fail because the
database disk is full or because backups were never configured.
Database maintenance is part of the requirement. The administrator or
developer should create regular backups, monitor storage, and avoid direct manual
edits during active testing. Migration tools such as Alembic should be used
whenever tables change. If model changes are applied manually without migration
history, deployment becomes risky because the production database may not match
the code. This is one of the future improvement points identified in the project.
27
The development machine should also support documentation and testing.
Browser access to `/docs` is useful because FastAPI generates an interactive
OpenAPI page. A developer can log in, copy a token, and test protected endpoints.
For WebSocket testing, a separate client or frontend is needed because Swagger UI
does not fully simulate the live test channel. This difference should be explained to
anyone installing the project.
Table 7. Minimum and recommended computer requirements
Requirement Area Minimum Recommended
Processor Dual-core CPU Quad-core CPU or better
Memory 8 GB RAM 16 GB RAM
Storage 5 GB free disk space SSD with 20 GB freeproject/database space
Operating system Windows 10/11,Ubuntu, or macOSWindows 11 or UbuntuLTS for stable development
Python Python 3.10+ Python 3.11+ withvirtual environment
Database PostgreSQL localinstanceManaged PostgreSQL orbacked-up production server
Editor Any text editor VS Code or PyCharmwith Python tooling
Browser/API testing Modern browser Browser plusPostman/Insomnia/curl
Listing 1. Local development startup commands
python -m venv .venv
.venv\Scripts\activate # Windows PowerShell uses .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
Table 8. API keys and configuration values
Configuration Value Purpose Security Note
28
DATABASE_URL Connects SQLAlchemyto PostgreSQL.Secret. Rotate ifcommitted.
JWT_SECRET_KEY Signs and verifies accesstokens.Secret. Must be long andrandom.
ACCESS_TOKEN_EX
PIRE_MINUTES Controls token lifetime.
Shorter values reduce
risk after token theft.
SMTP_* values Send verification andinvitation emails.Use app password, notnormal mailbox password.
GOOGLE_GEMINI_AP
I_KEY
Authenticate Gemini
resume-review prototype.
Secret. External AI
provider may process submitted
text.
CORS_ALLOWED_OR
IGINS
Allow trusted frontends
to call the API.
Do not use broad
wildcards with credentials in
production.
2.3 Methodologies, Algorithms, Security Mechanisms, and Models
The development methodology used for TalentFlow is modular backend
design. The application is divided into routers, schemas, models, authentication
utilities, mailer utilities, and algorithm utilities. This structure makes the project
easier to understand because each module has a clear responsibility. The admin
router controls administrative workflows, the testing router controls WebSocket
assessment, the login router controls authentication, and the model layer describes
database tables.
The main data model is relational. A company can have users and vacancies.
A vacancy can have candidates. A user can have test sessions. A question belongs
to the question bank. A practice is an assessment composed of question identifiers,
tags, duration, deadline, and validity status. A practice assignment connects a user
to a practice. A test session records one started attempt. A user answer records one
answer inside a session. This model separates design-time assessment content from
runtime attempts.
29
The security model begins with authentication. The user logs in with
username and password. The server checks the hashed password and creates a JWT
access token. The token is signed with a secret key and includes expiration.
Protected endpoints load the current user from the token. Admin-only endpoints
additionally check that the user's role is ADMIN or SUPERADMIN. This
separates identity from permission.
Authorization is more specific than authentication. A logged-in user may
still be forbidden from starting a test. The testing WebSocket checks the
`PracticeAssignment` table before creating a session. If no assignment exists for
the authenticated user and the practice, the connection is closed with a policy
violation. This design is central to the thesis because it solves the uninvited-access
problem.
The password mechanism uses bcrypt through Passlib. Passwords should not
be stored in plain text. When an administrator creates a user, a random password
can be generated and returned only once so that it can be sent to the student. The
stored value is a hash. This means that if the database is leaked, attackers do not
immediately receive user passwords. However, generated passwords should still be
changed or delivered carefully.
The adaptive difficulty algorithm uses failure rate and time spent. A question
that many users answer incorrectly receives a higher difficulty value. Time spent is
a secondary factor. The weighted sum is passed through a sigmoid function so that
the result remains between 0 and 1. This is an explainable mechanism, which is
appropriate for academic use. It does not replace the teacher's judgment, but it
gives the administrator evidence about question behavior.
The scoring model uses question points and total weight. If a user answers
correctly, the awarded points are calculated as the question's points divided by the
total points in the practice and multiplied by 100. If the answer is incorrect, the
awarded points are zero. The session's overall score is updated after each answer.
30
This model supports weighted questions, so harder or more important questions
can contribute more to the final result.
The WebSocket model is event-based. The client sends an action, and the
server responds with an event or an error. The main actions are `start_test`,
`get_question`, `submit_answer`, and `finish_test`. The server stores all important
decisions. The frontend should not decide whether the answer is correct or whether
the assignment is completed. This prevents client-side manipulation.
The email invitation mechanism is part of the administrative model. When
users are created in bulk, the admin can send invitations that contain username,
temporary password, and test link if a practice is assigned. The base frontend URL
is configurable so the same backend can support local development and production
frontend deployment. The invitation should be treated as sensitive because it
contains login information.
The system also needs audit thinking. The current project stores
assignments, sessions, and answers, but future versions should add explicit audit
logs for administrative actions: who created a question, who changed difficulty,
who assigned a test, who sent invitations, and when changes occurred. This is
important in university contexts because disputes may happen after testing.
The methodology can be described as workflow-first development. Instead
of beginning with isolated screens, the system begins with the real path of data. A
student account is created, then assigned to a practice, then invited, then
authenticated, then connected to a WebSocket session, then scored, then reviewed
by the admin. Each step creates or reads database records. This approach reduces
the chance of building attractive screens that do not enforce the real rules.
The system also follows the principle that the server should be the source of
truth. The frontend may display the timer, but the server stores the session. The
frontend may show answer options, but the server checks correctness. The frontend
may hide completed tests, but the server rejects re-entry. This principle is
31
especially important for testing platforms because users can inspect browser code,
modify requests, or attempt to call endpoints directly.
Data validation is a methodological requirement as well. The admin panel
receives complex input: UUID lists, group names, deadlines, question options,
correct answer indexes, email addresses, and optional invitation flags. If this input
is not validated, small mistakes can create invalid assessments. Pydantic schemas
help define valid shapes before the route logic executes. Database constraints then
provide another layer of protection.
Listing 2. Adaptive difficulty formula used by TalentFlow
```
time_factor = min(time_spent / 60.0, 1.0)
```
```
z = (0.8 * failure_rate) + (0.2 * time_factor) - 0.5
```
```
difficulty = 1 / (1 + exp(-z))
```
Table 9. Main mechanisms and algorithms
Mechanism Input Output Reason
JWT
authentication
Username,
password, secret key
Signed access
token
Stateless API
access and WebSocket
token verification.
Role check Current userroleAllowed orforbidden request
Protect admin
endpoints from
ordinary users.
Assignment
check
User ID and
practice ID
Start test or
reject connection
Prevent
uninvited users from
taking tests.
Session lock
Existing
TestSession and
completion state
Allow, reject,
or finish attempt
Prevent
repeated entries and
uncontrolled retakes.
Adaptive
difficulty
Failure rate and
time spent
Difficulty value
0-1
Improve
question bank evidence
over time.
Email invitation User credentialsand practice link
Delivered
message or delivery
error
Support mass
university onboarding.
32
2.4 Frameworks, Libraries, and Practical Usage Instructions
This section explains how the main frameworks and libraries are used in the
project. FastAPI is used to create the application object, mount routers, configure
CORS, and define REST and WebSocket endpoints. Each router groups related
operations. For example, the admin router contains endpoints for dashboard
summary, student statistics, users, companies, vacancies, candidates, questions,
practices, assignments, invitations, and test sessions. The testing router contains
the WebSocket endpoint and result endpoints.
SQLAlchemy is used in two main ways. First, it defines the database
models. Each model class describes a table and its columns. For example, `User`
includes username, role, password hash, company identifier, name, surname, age,
email, and group name. `PracticeAssignment` connects a practice to a user.
Second, SQLAlchemy sessions are used inside endpoint functions to query, insert,
update, and commit data. The `get_db` dependency provides a database session for
each request.
Pydantic schemas describe the data that endpoints receive and return. For
example, `AdminBulkUserCreate` describes a request for bulk student creation,
while `AdminBulkUserCreateResponse` describes created, existing, and failed
records. `QuestionCreate` defines question text, options, correct answer, difficulty
level, category, and points. This makes the API more predictable and reduces the
risk of malformed input.
Passlib with bcrypt is used for password hashing. The admin panel can
generate random temporary passwords, but only the hash is stored. When a user
logs in, the provided password is verified against the stored hash. This is a standard
security practice and should not be replaced with reversible encryption or plain text
storage.
33
The email helper uses SMTP over SSL. In production, a dedicated sender
mailbox should be configured. Gmail requires an app password for SMTP. The
helper should be called only after validating that the recipient email is correct and
that the admin has permission to create or invite the user. Failed email delivery
should be reported to the administrator rather than silently ignored.
The Gemini resume-review prototype uses a Google Generative AI key. Its
purpose is to compare a job description with resume text and return structured
JSON. To use this responsibly, the prompt should demand evidence-based output,
and the application should validate the returned JSON. Sensitive resume data
should not be sent to external services without proper privacy review and user
consent.
The installation process should be documented so that another developer can
run the project. After cloning the repository, the developer creates a virtual
environment, installs dependencies, configures environment variables, creates the
PostgreSQL database, runs migrations or table creation scripts, and starts Uvicorn.
The developer can then open `/docs` to test endpoints. For WebSocket testing, a
frontend or WebSocket client must pass a valid JWT token in the query string.
The current repository still contains some legacy pieces that should be
cleaned. Alembic migrations appear older than the current model definitions, and
some credentials are hardcoded in old files. A production-ready version should
centralize settings in one configuration module, remove committed secrets,
regenerate secrets, update migrations, and document environment variables in
`.env.example`.
A practical developer workflow for this project should follow a repeatable
sequence. First, create a branch for the feature. Second, update models or schemas
if the data contract changes. Third, implement route logic and keep role checks
near the entry point. Fourth, test the endpoint through `/docs` or an API client.
Fifth, add migration files if the database changed. Sixth, update the README and
34
thesis documentation so the implemented behavior is not hidden inside code only.
This habit is important because admin and testing features affect security.
Error handling should be clear for both users and admins. If a student is not
invited, the response should say that the user is not invited, not produce a generic
server error. If an email fails, the admin should see which address failed. If a
question has invalid options, the request should be rejected before it enters the
database. Good error messages reduce support work and help the platform feel
reliable during an exam.
The API documentation should be treated as part of the product. FastAPI's
generated docs are useful, but human documentation is still needed to explain why
endpoints exist and how they connect. For example,
```
`/admin/practices/{practice_id}/assignments` is not just a technical endpoint; it is
```
the operation that enforces which students may access a test. This meaning should
be written in the README, thesis, and developer notes.
Table 10. Frameworks and practical usage instructions
Library / Tool Where It Is Used Instruction for Use
FastAPI main.py and routers
Define endpoints with
decorators, dependencies, and
response models.
SQLAlchemy database/models.py androute queries
Define models, use
sessions, commit changes, and
avoid raw string SQL for normal
operations.
Pydantic schemas/user_schema.py
Define request and
response models with field
validation.
Passlib bcrypt routers/login.py androuters/admin_panel.pyHash passwords beforestorage and verify during login.
Uvicorn Development server Run `uvicorn main:app--reload` locally.
35
SMTP utils/mailer.py
Send invitation and
verification emails using
environment configuration.
Google Generative AI resume-review prototype
Use only with
configured API key and
validated structured output.
Figure 2.1. Technology stack diagram
CHAPTER 3. IMPLEMENTATION OF THE TALENTFLOW
PLATFORM
3.1 System Architecture and Database Structure
TalentFlow is implemented as a modular FastAPI backend. The application
object is created in `main.py`, where routers are included and CORS settings are
configured. The routers divide the system into domains: authentication, user
profile, email, vacancy and resume upload, candidate dashboard, admin panel,
testing, and tester main page. This structure allows the project to grow without
placing all code in one file.
The architecture follows a layered pattern. The client communicates with the
backend through HTTP REST endpoints and through the WebSocket testing
36
endpoint. The FastAPI layer validates requests and calls route logic. Pydantic
schemas define expected request and response structures. SQLAlchemy sessions
communicate with the PostgreSQL database. Utility modules provide supporting
behavior such as JWT handling, email delivery, and adaptive difficulty calculation.
The database structure is central to the system. The `Company` model
represents an organization, such as a university, training center, or employer. The
`User` model represents a person who can log in. A user has a role, profile fields,
optional company link, and optional group name. The group name is important for
university scenarios because students are commonly organized by group, faculty,
or cohort.
The `Created_Vacancy` model represents a job vacancy. It includes job
name, description, tags, dates, availability, candidate count, and company relation.
The `Candidate` model stores candidate-related data: user link, status, full name,
resume location, AI score, education, experience, skills, and vacancy link. This
allows TalentFlow to connect recruitment records with assessment results.
The testing models form a separate but connected group. `Question` stores
question text, options, correct answer, difficulty level, category, and points.
`Practice` stores an assessment title, description, duration, deadline, validity status,
tags, and a list of question identifiers. `PracticeAssignment` connects a practice to
a user and stores completion state. `TestSession` represents one test attempt.
`UserAnswer` records each submitted answer inside a session.
This separation is important. A question can exist before it is used in a
practice. A practice can be assigned to many users. A user can have many
assignments. A session records a concrete attempt, not just the existence of an
assignment. Answers belong to sessions, so the system can review how a score was
produced. This model supports both academic and recruitment use cases.
The current database design already supports the core thesis goal, but it also
shows future improvement points. For multi-organization production use, questions
and practices should include ownership fields such as `company_id` and
37
`created_by`. This would allow each university or company to maintain its own
question bank. Audit logs should also be added for administrative actions.
Table 11. Database entities used by TalentFlow
Entity Main Fields Role in the System
Company id, name, phone, INN,email
Represents an
organization that owns users and
vacancies.
User
id, username, role,
password, company_id,
group_name
Represents admins,
students, candidates, and
superadmins.
Created_Vacancy job_name, description,tag, dates, company_idStores recruitmentopportunities.
Candidate user_id, vacancy_id,status, resume, ai_scoreConnects users torecruitment applications.
Question
text, options,
correct_answer, difficulty,
category, points
Stores assessment items.
Practice title, question_ids, tags,duration, deadlineRepresents a test orassessment.
PracticeAssignment practice_id, user_id,assigned_at, is_completedControls who mayaccess a test.
TestSession session_id, practice_id,user_id, score, started_time Records one attempt.
UserAnswer
session_id, question_id,
user_answer, correctness,
time_spent
Stores answer-level
evidence.
38
Figure 3.1. Database entity relationship diagram
The API structure mirrors the database structure. Admin endpoints are
placed under `/admin`, testing endpoints under `/testing`, authentication under
`/auth`, and user profile features under profile-related routers. This makes the API
easier to navigate. A developer can open the automatic Swagger UI and inspect
endpoints by tag. This is especially useful during defense because the system can
be demonstrated directly from the documentation interface.
The architecture can be described as backend-first. Although a polished
frontend is important for real users, the thesis focuses on the backend rules that
make the platform trustworthy. A frontend can hide or show buttons, but it cannot
be the authority for security. The backend must check role, assignment, session
state, deadline, and completion status. TalentFlow places these checks in
server-side route logic.
39
The database design also supports reporting. Because answers are linked to
sessions and sessions are linked to users and practices, the platform can calculate a
user's average score, count completed sessions, and display pending assignments.
Because vacancies and candidates are stored separately, the recruitment module
can later show how many candidates applied to each vacancy and how their
assessment results compare. This relational structure is more useful than storing all
result data in one unstructured table.
Another architectural decision is the use of UUID identifiers. UUIDs are
longer than integer IDs, but they are harder to guess and work better when data
may be created across different environments. In a testing platform, guessable
numeric IDs can increase the risk of users trying to access resources by changing
numbers in URLs. UUIDs are not a replacement for authorization, but they reduce
accidental exposure and fit modern API design.
The model still needs normalization improvements before production. The
`Practice` model currently stores question identifiers in an array. This is convenient
for ordering and quick development, but a join table such as `practice_questions`
would give stronger relational integrity and easier query flexibility. The current
approach is acceptable for a prototype, while the thesis roadmap identifies a more
normalized design as future work.
3.2 Admin Panel: Vacancies, Users, Tests, Invitations, and Statistics
In TalentFlow, the admin panel is the most important operational part of the
platform. The administrator is the person who creates vacancies, creates tests,
creates questions, assigns tests to users, and monitors statistics. In a university
scenario, the administrator may represent a faculty, department, or testing center.
This admin can invite many students to testing, send them login credentials, and
make sure only invited students can access the assessment.
The admin panel is protected by a role check. Ordinary users cannot access
admin endpoints. The function `require_admin` verifies that the current user has
ADMIN or SUPERADMIN role. This prevents students or candidates from
40
creating questions, seeing other users, or assigning tests. Admins can also be
scoped by company so that one organization's data is not exposed to another
organization. This is essential for a platform that may support multiple universities
or employers.
User management includes listing users, searching users, creating one user,
creating many users, and viewing user details. The search endpoint allows admins
to find students by name, surname, username, email, or group. Bulk creation
supports a university workflow where a list of students is imported or provided by
an admin. The system can generate unique usernames and random passwords.
Existing users can be skipped to avoid duplicate accounts.
Invitation delivery is connected to user creation and practice assignment.
When the admin creates or bulk-creates users, the request can include a practice
identifier and a flag to send invitations. The platform assigns the practice to the
user and sends an email containing login information and the test link. This is more
professional than manually sending links through messengers because the
invitation is tied to a database assignment.
Vacancy management is also part of the admin panel. Admins can create,
list, update, and inspect vacancies. A vacancy contains the job name, description,
tags, start date, end date, availability, and company relation. Candidate records can
be filtered by vacancy, and candidate statuses can be updated. This supports the
recruitment side of the platform.
Question management includes creating questions, creating questions in
bulk, viewing a question, updating a question, updating difficulty, and viewing
difficulty history. Each question contains options as structured JSON. The correct
answer is stored as a UUID of the correct option. This is better than storing plain
letters like A or B because option order can change and identifiers remain stable.
Practice management allows admins to create tests from selected question
IDs, define title and description, set duration, set deadline, add tags, and mark the
41
practice as valid. The practice is not automatically available to everyone. It must be
assigned to users or groups. This distinction is what makes the test invitation-only.
Assignment management is one of the most important admin features. The
endpoint for advanced assignments can add users by IDs, add groups, remove
users, remove groups, and optionally send invitations. In a university setting, this
means the admin can assign one assessment to an entire group without selecting
each student manually. If a student is removed from an assignment, the system
should prevent future access unless a session already exists and policy allows
continuation.
Statistics give admins a management view. The dashboard summary includes
totals for users, candidates, vacancies, practices, questions, active sessions,
completed sessions, and average score. Student statistics show assigned tests,
completed assignments, pending assignments, active sessions, completed sessions,
average score, and last activity. These metrics help administrators monitor testing
progress instead of waiting until the end and checking spreadsheets manually.
The admin panel also supports academic accountability. If a student claims
not to have received a test, the administrator can check whether the account exists,
whether the test was assigned, whether the invitation was attempted, and whether
the session was started. If many students fail, the admin can inspect question
difficulty and answer records. This turns the platform into a management system
rather than just a quiz engine.
Table 12. Admin panel endpoint workflow
Admin Workflow Endpoint Group Purpose
Dashboard overview /admin/dashboard/summaryShow platform totalsand average score.
Student statistics /admin/dashboard/students
Monitor assigned,
pending, completed, and scored
tests.
42
User search /admin/users/search
Find students or
candidates by personal and
group fields.
Single user creation /admin/users
Create one
student/candidate/admin-scoped
account.
Bulk user creation /admin/users/bulk Invite many students andoptionally assign a test.
Vacancy management /admin/vacancies Create and updaterecruitment vacancies.
Question bank /admin/questions Create, edit, bulk create,and recalibrate questions.
Practice management /admin/practices Create tests fromselected question IDs.
```
Assignments /admin/practices/{id}/assignmentsAdd/remove users orgroups from a test.
```
```
Invitations /admin/practices/{id}/invitationsSend test invitations toassigned users.
```
Test-session review /admin/test-sessions Review attempts andanswer-level evidence.
Figure 3.2. Admin dashboard screenshot prompt
43
Figure 3.3. Assessment assignment screen prompt
The improved admin panel responds directly to the project's real use case.
Earlier versions of the idea treated admin as a general manager. In the final design,
admin is more specific: an admin is the person who creates vacancies, creates
assessments, creates or imports users, assigns tests, sends invitations, and monitors
student or candidate progress. A university admin is a special but important case
because the admin may need to invite a large group of students and deliver
passwords by email.
Non-invited users must not access tests. This is enforced not by hiding the
frontend button, but by the WebSocket start logic. Even if a user discovers the
practice identifier, the server checks assignment before creating the test session.
This is a professional design decision because backend authorization remains
effective even when frontend code is visible or manipulated.
A university admin scenario can be described step by step. Before the exam,
the admin receives a student list from a department. The admin uploads or enters
students with names, emails, ages, and group names. The system generates
usernames and passwords. The admin creates a practice from selected questions,
44
sets a deadline and duration, assigns the practice to the group, and sends
invitations. During the exam period, the admin watches pending and completed
counts. After the deadline, the admin exports or reviews results and identifies
students who did not participate.
A company admin scenario is similar but not identical. The company creates
a vacancy, collects candidate applications, and assigns an assessment to candidates
who pass the first screening stage. The admin then reviews assessment results
together with resume evidence and status. A candidate can be moved from Applied
to Testing, Interview, Rejected, or other status values. This shows why the platform
contains both vacancy/candidate entities and assessment entities.
The admin panel should also support mistakes. Real administrators
sometimes enter the wrong email, choose the wrong group, or need to remove a
student from an assignment. The API therefore includes update and removal
operations. A professional system must support correction without requiring direct
database edits. This principle is especially important in education because student
records must be handled carefully.
Table 13. Practical admin scenarios
Scenario Admin Steps System EvidenceProduced
University midterm test
Create group users,
create practice, assign group,
send invitations.
User records,
assignments, invitation attempts,
sessions, answers, scores.
Training center
placement test
Create applicants, assign
skill test, monitor completion.
Assigned-test list,
completion state, score
distribution.
Company vacancy
screening
Create vacancy, review
candidates, assign assessment.
Candidate status,
vacancy link, test result,
resume-review fields.
Retest policy
Remove/restore
assignment or create new
practice according to policy.
Traceable assignment
changes and separate sessions.
45
Question-bank
maintenance
Update question, adjust
difficulty, review history.
Question records and
difficulty history entries.
3.3 Candidate/User Panel and Invitation-Only Testing Workflow
The candidate or student panel is the user-facing side of TalentFlow. Its
purpose is not to expose every test in the system. It should show only the
assessments assigned to the current user. This is important because a student may
belong to one group and should not see another group's exam. A candidate may be
connected to one vacancy and should not access unrelated screening tests. The
panel therefore depends on the assignment records created by the admin.
The candidate workflow begins when the admin creates or imports the user.
If email is available, the platform can send login credentials and a test link. The
user logs in, receives a JWT token, and opens the assigned test list. The testing
router provides assignment endpoints that return active, completed, or all assigned
tests. This lets the frontend show a dashboard with pending and completed
assessments.
When the user opens a test, the frontend establishes a WebSocket connection
```
to `/testing/practices/{practice_id}/ws?token=<jwt>`. The token is required
```
because browser WebSocket constructors do not reliably allow custom
authorization headers. The backend verifies the token and loads the user. If
verification fails, the connection is closed. If verification succeeds, the server waits
for client actions.
The first action is `start_test`. At this point, the server checks whether the
user has an assignment for the practice. If there is no assignment, the server sends
an error and closes the connection. If the assignment is already completed, the
server also closes the connection. If an existing session already exists, re-entry is
rejected. These rules prevent a user from starting unauthorized or repeated
attempts.
46
If the assignment is valid, the server creates a new `TestSession`. The
session stores the user ID, practice ID, score, finish status, and start time. The
server returns a `test_started` event with session ID, number of questions, and
duration. The frontend can then request questions one by one. The backend selects
the next unanswered question from the practice's question list.
During answer submission, the frontend sends question ID, selected option
ID, and time spent. The server checks that the test has started, the question exists,
and the same question was not already answered in this session. Then it compares
the submitted option ID with the stored correct answer ID. If correct, it awards
weighted points. The answer is stored in `UserAnswer`, and the session score is
updated.
When all questions have been answered, or when the client sends
`finish_test`, the server finishes the session. The assignment is marked as
completed, completion time is stored, and the WebSocket is closed. After
completion, the user can request the result through the result endpoint. This
workflow creates a clear end state and prevents repeated manipulation.
The user panel should also be designed with clarity. A student needs to know
which tests are active, which are completed, what the deadline is, how long the test
lasts, and whether the result is available. A candidate needs to know the vacancy
context, status, and next step. The frontend should not display confusing technical
details such as UUIDs unless necessary for debugging.
The invitation-only workflow also improves the student's experience. Instead
of searching for a correct test link in a chat, the student logs in and sees a
controlled list of assigned tests. This reduces confusion and reduces the number of
support messages sent to administrators. When a test is completed, the status
changes, and the student understands that the attempt is closed.
The system should handle edge cases in a predictable way. If the deadline
has passed, the user should receive a clear message. If the assignment is
completed, the user should not see a start option. If a connection is interrupted, the
47
policy should decide whether continuation is allowed. The current implementation
rejects re-entry when a session already exists. This is strict, but it protects
assessment integrity. A future version could support controlled resume only if the
interruption is logged and approved.
A good user panel should not expose admin complexity. The student does
not need to know how question IDs are stored, how assignments are created, or
how the score formula is implemented. The student needs a stable workflow: login,
open assigned test, answer questions, finish, and see result. The admin and
backend carry the complexity so that the user experience remains simple.
Table 14. Candidate/user testing workflow
Step User Action Server Decision
1 Receives emailinvitationCredential and optionaltest link are delivered by SMTP.
2 Logs in Password is verified andJWT token is issued.
3 Views assigned tests
API returns only
practices assigned to the current
user.
4 Connects to WebSocket JWT token is verifiedfrom query parameter.
5 Starts test
Assignment, completion
status, deadline, and existing
session are checked.
6 Requests question
Next unanswered
question is loaded from
database.
7 Submits answer
Answer is stored, score
is updated, difficulty may be
recalculated.
8 Finishes test Session and assignmentare locked as completed.
9 Views result Server returns storedscore and completion data.
48
Figure 3.4. Candidate dashboard screenshot prompt
3.4 WebSocket Testing Module and Adaptive Scoring
The WebSocket testing module is the technical core of the live assessment
workflow. Unlike an ordinary REST request, a WebSocket connection remains
open while the test is being conducted. This is useful because the client and server
exchange multiple related messages inside one session. TalentFlow uses this
channel to start the test, deliver questions, receive answers, return feedback, and
close the test.
The WebSocket endpoint is protected by token authentication. The token is
passed as a query parameter because the browser WebSocket API does not provide
the same header control as ordinary HTTP requests. The backend verifies the token
using the same JWT logic as protected REST endpoints. If the token is invalid, the
server closes the connection with a policy violation code. This is important because
the test channel must not become a bypass around normal authentication.
The server accepts the connection only after authentication. After that, it
waits for JSON messages. Each message contains an `action`. This event-driven
protocol is simple and readable. `start_test` creates the test session after assignment
49
checks. `get_question` loads the next unanswered question. `submit_answer` stores
the answer and updates score. `finish_test` closes the assessment manually. If the
client sends an unknown action, the server can return an error.
The session ID is stored in server-side logic after `start_test`. The client
receives the session ID, but the important authority remains on the server. The
client does not decide final score. The client does not decide whether an
assignment is completed. The client does not decide whether a question is correct.
These decisions are made after database queries.
The question delivery logic checks which questions have already been
answered by querying `UserAnswer` for the current session. Then it iterates
through the practice's question list and returns the first unanswered question. This
approach is simple and deterministic. Future versions can add randomization or
category balancing, but the current implementation is easier to defend because the
sequence is clear.
Answer submission includes a duplicate-answer check. If the same question
is answered again in the same session, the server rejects it. This prevents a user
from repeatedly submitting until the correct answer is found. The answer is stored
with correctness, awarded points, and time spent. Storing time spent allows later
analysis and adaptive difficulty calculation.
The adaptive scoring component updates question difficulty after answers
are collected. The system calculates total attempts, failures, and average time for
the question. Failure rate receives weight 0.8, and time factor receives weight 0.2.
A bias of -0.5 shifts the result so that easy questions stay lower. The sigmoid
```
function compresses the output into the interval from 0 to 1.
```
The formula is intentionally explainable. A more complex machine learning
model could be built later, but for a bachelor project it is better to use a method that
can be tested and defended. The administrator can understand that questions
answered incorrectly by many users become harder. Questions answered correctly
50
and quickly become easier. This supports question bank improvement without
hiding logic.
Finishing the test is handled by a helper function. The helper marks the
session as finished, marks the assignment as completed, stores completion time,
commits changes, sends a `test_finished` event, and closes the connection. This
keeps completion logic consistent whether the test ends automatically after the last
question or manually through a finish action.
The WebSocket protocol must be documented clearly because it is not as
easy to understand as simple REST endpoints. A REST endpoint has a method,
URL, request body, and response body. A WebSocket workflow has a sequence of
events over time. If frontend developers do not understand this sequence, they may
try to request questions before starting a test, submit answers without a session, or
handle completion incorrectly. The table below documents the protocol so the
frontend and backend can remain synchronized.
Timeout and disconnection policy is a future concern. In the current strict
model, a created session prevents re-entry. This prevents abuse but may be harsh if
a student's internet disconnects. A production platform can improve this by storing
heartbeat events and allowing limited reconnection within a short time window.
Such a policy should be configured by the institution because high-stakes exams
may prefer strictness while practice tests may allow recovery.
Another future improvement is randomized question delivery.
Randomization can reduce answer sharing, but it must be implemented carefully. If
each student receives a different order, the result calculation should remain the
same. If each student receives different questions, the system needs category
balancing and difficulty balancing so the test remains fair. TalentFlow's current
deterministic order is simpler and easier to verify, which is appropriate for the first
implementation.
Table 15. WebSocket protocol used by TalentFlow
51
WebSocket Action /
Event Direction Purpose
start_test Client to server Request session creationafter assignment validation.
test_started Server to client Return session ID,question count, and duration.
get_question Client to server Request the nextunanswered question.
question_data Server to client Send question text,options, category, and points.
submit_answer Client to server Send selected option andtime spent.
answer_result Server to client
Return correctness,
awarded points, and updated
difficulty.
finish_test Client to server Request manualcompletion.
test_finished Server to client Return final score andclose the assignment.
Listing 3. WebSocket client message examples
```
{ "action": "start_test" }
```
```
{ "action": "get_question" }
```
```
{
```
"action": "submit_answer",
"question_id": "question-uuid",
"user_answer": "option-uuid",
"time_spent": 42
```
}
```
```
{ "action": "finish_test" }
```
52
Figure 3.5. WebSocket testing sequence diagram
3.5 Functional Capabilities, Testing, Limitations, and Future Development
The implemented platform provides several functional capabilities. It
supports authentication, user profiles, vacancy creation, candidate records, admin
dashboard summary, student statistics, user search, individual user creation, bulk
user creation, email invitations, company lists, vacancy lists, candidate status
updates, question creation, bulk question creation, question updates, difficulty
updates, practice creation, practice assignment, invitation sending, WebSocket
testing, session review, answer review, candidate dashboards, and result retrieval.
From the university perspective, the most important capability is mass
assessment management. The admin can create many student accounts, assign
them to a group, create a test, assign the test to the group, and send invitations. The
students do not need to register themselves. This is useful when the institution
wants centralized control over who participates. It also reduces friction for students
because they receive ready login information.
53
From the recruitment perspective, the platform connects vacancies,
candidates, resumes, statuses, and tests. A company can create vacancies and
evaluate candidates through structured assessment. The AI resume-review
prototype can later be connected to the upload workflow so that recruiters receive a
structured summary. However, human review should remain part of the process
because resume analysis can be biased or incomplete if treated as a final decision.
Testing the platform should include unit tests, integration tests, and
workflow tests. Unit tests can check username generation, password hashing,
option normalization, correct answer resolution, adaptive difficulty calculation, and
score calculation. Integration tests should check login, admin access rejection for
ordinary users, user creation, bulk invitation, practice creation, assignment
creation, unauthorized WebSocket rejection, authorized test start, answer
submission, completion, and result retrieval.
The WebSocket workflow is especially important to test because many
security rules meet there. A test should not start without a token. A token should
not be enough without assignment. A completed assignment should not restart. A
duplicate answer should be rejected. A finished session should update assignment
completion. These cases protect the value of the result.
The current project has limitations. The frontend screenshots are represented
in this thesis as Nano Banana prompts because images are not embedded by
request. The database migration history should be aligned with the current
SQLAlchemy models. Some legacy configuration values should be moved to
environment variables. The resume-review prototype should be connected to the
actual upload endpoint with JSON validation and error handling. Practices and
questions should receive ownership fields for multi-organization isolation.
Another limitation is advanced proctoring. The platform prevents uninvited
access and repeated sessions, but it does not yet verify camera activity, screen
sharing, biometric identity, or browser lock. These features require careful legal
54
and ethical review because they involve privacy. The thesis therefore presents them
as future work, not as implemented functionality.
Future development can improve the admin experience. CSV import should
allow universities to upload student lists. Email delivery logs should show which
invitations succeeded or failed. Group filters should support large cohorts. Reports
should export to Excel or PDF. Admin audit logs should show who changed
assignments, questions, deadlines, and difficulty. These features would make the
platform more useful during real examination periods.
Future development can also improve assessment quality. Question
randomization can reduce sharing of exact order. Category balancing can ensure
that every student receives a fair mix of topics. Written-answer support can allow
deeper evaluation, but it requires rubrics and manual or AI-assisted scoring.
Plagiarism detection can be added for essays or long answers. Difficulty history
can be visualized over time to help administrators maintain a better question bank.
Deployment improvements include HTTPS, WSS, secure cookies, strict
CORS, database backups, monitoring, error reporting, rate limits, and secret
rotation. A production deployment should never print full WebSocket URLs with
tokens into logs. It should also store environment variables securely and restrict
```
database access. These are not optional details; they are part of turning a student
```
project into a real platform.
Security testing should be repeated after every admin-panel change. Admin
endpoints are powerful, so a small mistake can expose student data or allow
unauthorized assignment changes. Tests should verify not only successful
workflows but also forbidden workflows. For example, an ordinary user must not
create a question. An admin from one company should not manage another
company's users. A user who knows a practice UUID but has no assignment must
still be rejected by the WebSocket endpoint.
Performance testing is also useful. If a university invites hundreds of
students at once, the bulk creation endpoint should not become slow or partially
55
inconsistent. If many students start a test at the same time, the database should
handle session creation and answer storage reliably. Indexes on frequently filtered
fields such as username, group name, user ID, practice ID, and company ID can
improve performance. Monitoring should show database errors before they become
examination-day failures.
The future roadmap should be realistic. The next version should not
immediately jump to complex AI proctoring. It should first finish production
```
basics: migrations, environment settings, CSV import, email logs, audit logs, report
```
export, and frontend polish. Only after these foundations are stable should
advanced AI, camera monitoring, plagiarism detection, and written-answer scoring
be added. This staged roadmap is more professional than promising every feature
at once.
Table 16. Security-oriented negative test matrix
Risk Area Negative Test Expected Protection
Admin authorization USER role calls/admin/questions.Request is rejected withforbidden status.
Company isolation Admin attempts toaccess another company's users.Query scope blocksvisibility or update.
Uninvited access Authenticated user startsunassigned practice.WebSocket sendsnot-invited error and closes.
Repeated attempt Completed userreconnects to same practice.
Existing
completion/session blocks
restart.
Duplicate answer Same questionsubmitted twice.Second answer isrejected.
Expired practice User starts afterdeadline.Server rejects theattempt.
Secret exposure Logs include fulltokenized WebSocket URL.Production loggingremoves token values.
Table 17. Recommended workflow test plan
56
Test Case Expected Result
Ordinary user calls admin endpoint HTTP 403 forbidden response.
Admin creates a student User is stored with bcrypt-hashedpassword.
Admin creates many students Unique usernames are generated andexisting users can be skipped.
Admin assigns a practice to a group PracticeAssignment rows are created forvisible group members.
Unassigned user starts WebSocket test Connection returns error and closes.
Assigned user starts WebSocket test TestSession is created and test_startedevent is returned.
User submits duplicate answer Server rejects duplicate answer.
Last question is answered Session is finished and assignment ismarked completed.
Admin views student stats Assigned, pending, completed, andaverage score values are returned.
Table 18. Limitations and future development
Limitation Risk Future Improvement
Migration drift Production databasemay not match models.Update and test Alembicmigrations.
Hardcoded legacy
credentials
Secret exposure and
difficult deployment.
Centralize configuration
in environment variables.
No CSV import yet
Bulk onboarding still
requires structured
JSON/manual input.
Add CSV/XLSX import
with validation preview.
No advanced proctoring Identity and behavior arenot fully monitored.
Evaluate
privacy-compliant proctoring
options.
No ownership fields on
questions/practices
Multi-organization
question banks need stronger
isolation.
Add company_id and
created_by columns.
57
Resume AI not fully
wired
Recruitment AI remains
prototype-level.
Integrate with upload
flow and validate model output.
Figure 3.6. Functional workflow diagram
CONCLUSION
The thesis studied the problem of secure digital assessment and
recruitment-oriented evaluation and presented TalentFlow as a practical software
solution. The project was developed in response to a real need: universities and
companies increasingly use digital tools, but ordinary open links and simple forms
do not provide enough control for high-trust testing. The platform therefore
focuses on invitation-only access, admin-controlled assignments, role-based
permissions, stored sessions, answer persistence, and result review.
The first chapter showed that the topic is relevant for Uzbekistan's digital
education and labor-market environment. Digital transformation creates demand
for platforms that can manage large groups, reduce administrative work, and
preserve trustworthy result data. Existing learning management systems, forms,
testing platforms, applicant tracking systems, and proctoring services each solve
part of the problem, but they do not always combine assessment, recruitment,
invitation, and admin statistics in a focused workflow. The problem statement
58
defined the need for a platform where admins can create users, tests, invitations,
assignments, and reports while uninvited users cannot access assessments.
The second chapter justified the selected technologies. Python and FastAPI
were chosen for clear API development, automatic documentation, asynchronous
support, and WebSocket capability. PostgreSQL and SQLAlchemy were chosen for
relational data modeling and reliable storage. Pydantic was used for validation.
JWT and bcrypt were used for authentication and password security. SMTP was
used for invitations. WebSocket was used for the live testing loop. The chapter also
described computer requirements, database server needs, configuration values,
algorithms, and library usage instructions.
The third chapter described the implemented TalentFlow platform. The
backend includes models for companies, users, vacancies, candidates, questions,
practices, assignments, test sessions, and answers. The admin panel supports
dashboard statistics, student statistics, user search, single and bulk user creation,
vacancy management, candidate status management, question management,
practice management, assignment management, invitation sending, test session
review, and answer review. The candidate workflow supports assigned-test listing,
WebSocket testing, answer submission, score calculation, and result retrieval.
The main practical result is that test access is controlled by the server. A user
must be authenticated, but authentication alone is not enough. The user must also
have a practice assignment. If an assignment does not exist, the WebSocket test is
rejected. If the assignment is completed or a session already exists, repeated entry
is blocked. This directly solves the requirement that non-invited users must not
access the test.
The project also implemented an adaptive difficulty mechanism. The
mechanism uses failure rate and time spent to recalculate a question difficulty
value between 0 and 1. This gives administrators evidence about question behavior
and can help improve the question bank over time. The thesis presents this
honestly as an explainable formula, not as exaggerated artificial intelligence. The
59
Gemini resume-review component is documented as a prototype for recruitment
support and should be connected carefully in future work.
The completed work demonstrates that a professional admin panel is not
merely an extra interface. It is a security and management layer. The admin defines
who exists in the system, who receives credentials, which tests exist, which
questions belong to them, which users are assigned, and which results are
reviewed. For a university admin, this means mass student invitation and
monitoring. For a company admin, it means vacancy and candidate assessment
management.
Future development should focus on production readiness. Important
improvements include updated migrations, centralized environment configuration,
secret rotation, CSV import, email delivery logs, audit logs, organization-owned
question banks, richer analytics, report exports, better frontend dashboards,
written-answer scoring, plagiarism checks, and privacy-compliant proctoring.
These improvements would make TalentFlow stronger as a real SaaS product for
universities and companies.
In conclusion, TalentFlow solves a concrete and relevant problem by
combining secure assessment, administrative control, real-time testing,
database-backed evidence, and recruitment support. The system is not only a
```
demonstration of FastAPI programming; it is an applied platform design that
```
connects technical implementation with institutional needs. The thesis therefore
achieves its aim: to design, implement, and document a secure web platform for
invitation-based academic testing and recruitment-oriented evaluation.
Table 19. Completed thesis tasks
Thesis Task Result Achieved
Analyze relevance Digital assessment needs in Uzbekistan,education, and recruitment were discussed.
Set the problem Invitation-only assessment withadmin-controlled workflow was formally defined.
60
Select technologies
FastAPI, PostgreSQL, SQLAlchemy,
Pydantic, JWT, SMTP, and WebSocket were
justified.
Design database Core entities and relationships weredocumented.
Implement admin panel
Users, bulk invitations, vacancies,
questions, practices, assignments, and statistics
were covered.
Implement testing workflow
WebSocket assessment with assignment
check, sessions, answers, scoring, and completion
was documented.
Evaluate limitations
Security, deployment, migration,
proctoring, AI, and roadmap issues were
identified.
61
REFERENCES
8. Ministry of Digital Technologies of the Republic of Uzbekistan. Uzbekistan -
2030 Strategy. https://www.digital.gov.uz/en/pages/2030_strategy
9. Ministry of Digital Technologies of the Republic of Uzbekistan. Digital
Technologies and Transport: Digital Uzbekistan - 2030 Strategy overview.
```
https://www.digital.gov.uz/en/activity_page/digital_technology
```
10. FastAPI Documentation. FastAPI framework guide and API reference.
```
https://fastapi.tiangolo.com/
```
11. SQLAlchemy Documentation. SQLAlchemy ORM and SQL toolkit
documentation. https://docs.sqlalchemy.org/
12. PostgreSQL Global Development Group. PostgreSQL documentation.
```
https://www.postgresql.org/docs/
```
13. Pydantic Documentation. Data validation using Python type hints.
```
https://docs.pydantic.dev/
```
14. OWASP Foundation. Authentication Cheat Sheet and Web Security Testing
Guide. https://owasp.org/
15. National Institute of Standards and Technology. Digital Identity Guidelines,
NIST Special Publication 800-63. https://pages.nist.gov/800-63-3/
16. MDN Web Docs. The WebSocket API.
```
https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
```
17. Google AI for Developers. Gemini API documentation. https://ai.google.dev/
18. Moodle Documentation. Assessment and quiz platform documentation.
```
https://docs.moodle.org/
```
19. Canvas LMS Documentation. Learning management and assessment
documentation. https://community.canvaslms.com/
20. Python Software Foundation. Python language documentation.
```
https://docs.python.org/
```
21. Passlib Documentation. Password hashing library for Python.
```
https://passlib.readthedocs.io/
```
22. Uvicorn Documentation. ASGI web server implementation.
```
https://www.uvicorn.org/
```
23. Starlette Documentation. ASGI framework and WebSocket support.
```
https://www.starlette.io/
```
62
APPLICATIONS
The Applications section contains supporting technical material that is useful
for supervisors and future developers but is not counted as part of the main page
volume. It includes endpoint maps, data model notes, WebSocket examples,
selected code excerpts, and image-generation prompts. No screenshots are
```
embedded in this document; prompt text is provided so that clean diagrams or
```
screenshots can be generated later.
Application A. Admin API Endpoint Map
Application Table A1. Admin API map
Area Endpoint Examples Purpose
Dashboard
GET
```
/admin/dashboard/summary;
```
GET /admin/dashboard/students
Statistics and student
progress.
Users
```
GET /admin/users; GET
```
```
/admin/users/search; POST
```
```
/admin/users; POST
```
/admin/users/bulk
Search, create, and bulk
invite users.
Companies
```
GET /admin/companies;
```
GET
```
/admin/companies/{id}/users
```
Organization-level
browsing.
Vacancies
GET/POST
```
/admin/vacancies; PATCH
```
```
/admin/vacancies/{id}
```
Recruitment vacancy
management.
Candidates
```
GET /admin/candidates;
```
PATCH
```
/admin/candidates/{id}/status
```
Candidate pipeline
review.
Questions
GET/POST
```
/admin/questions; POST
```
```
/admin/questions/bulk; PATCH
```
```
/admin/questions/{id}
```
Question bank control.
Practices
GET/POST
```
/admin/practices; PATCH
```
```
/admin/practices/{id}
```
Assessment creation and
updates.
Assignments
GET/PATCH
```
/admin/practices/{id}/assignmen
```
ts
Add/remove users and
groups.
```
Invitations POST/admin/practices/{id}/invitationsSend invitations toassigned users.
```
Sessions
GET
```
/admin/test-sessions; GET
```
```
/admin/test-sessions/{id}/answer
```
s
Review attempts and
answer evidence.
Application B. WebSocket Protocol Notes
Application Listing B1. WebSocket URL format
```
ws://127.0.0.1:8000/testing/practices/{practice_id}/ws?token={jwt_access_token}
```
Production deployments must use:
```
wss://api.example.com/testing/practices/{practice_id}/ws?token={jwt_access_token}
```
Application Listing B2. Test-start rejection logic in pseudocode
verify JWT token
load current user
```
receive { "action": "start_test" }
```
find PracticeAssignment where practice_id == requested practice and user_id == current user
if assignment does not exist:
send error "You are not invited to this test"
close websocket
if assignment is completed:
send error "This assignment is already completed"
close websocket
if TestSession already exists:
send error "Re-entry is not allowed"
close websocket
create TestSession
send test_started event
Application C. Selected Code Structure
Application Table C1. Source code structure
Path Description
main.py FastAPI app setup, router registration,CORS, and health endpoint.
database/models.py
SQLAlchemy models for companies,
users, vacancies, candidates, questions, practices,
assignments, sessions, and answers.
database/database.py SQLAlchemy engine, session factory,Base, and database dependency.
auth/jwt_handler.py JWT creation and token verificationhelpers.
routers/login.py Login, registration, current-userdependency, and WebSocket token helper.
routers/admin_panel.py
Admin dashboard, users, bulk invitations,
vacancies, candidates, questions, practices,
assignments, and sessions.
routers/questions.py Live WebSocket testing, result endpoint,and assigned-test list endpoint.
schemas/user_schema.py Pydantic request and response schemas.
utils/ai_logic.py Adaptive difficulty calculation.
utils/mailer.py SMTP email invitation helper.
Application Listing C1. Difficulty function concept
```
def calculate_difficulty_score(failure_rate: float, time_spent: float) -> float:
```
```
w1 = 0.8
```
```
w2 = 0.2
```
```
bias = -0.5
```
```
time_factor = min(time_spent / 60.0, 1.0)
```
```
z = (w1 * failure_rate) + (w2 * time_factor) + bias
```
```
return sigmoid(z)
```
Application D. Nano Banana Prompt Bank
Application Table D1. Image prompt bank
Visual Needed Nano Banana Prompt
Admin dashboard Create a clean SaaS admin dashboardscreenshot for TalentFlow with cards for users,
assignments, completed tests, pending tests,
average score, plus student search and bulk invite
controls. White background, blue accents, no
logos.
User panel
Create a candidate/student dashboard
screenshot showing assigned tests with title,
deadline, duration, status, score, and action button.
Modern academic interface, readable table, no
photos.
Database schema
Generate a professional ERD for
Company, User, Vacancy, Candidate, Question,
Practice, PracticeAssignment, TestSession,
UserAnswer, and QuestionHistory. Show primary
keys and foreign keys.
WebSocket flow
Create a sequence diagram showing
browser, FastAPI WebSocket, PostgreSQL, and
Admin Dashboard for connect, verify token,
start_test, assignment check, get_question,
submit_answer, save answer, finish test.
Recruitment workflow
Create a workflow diagram from vacancy
creation to candidate application, resume upload,
AI-assisted review, assessment assignment,
WebSocket test, score, and admin decision.
University bulk invitation
Create a process diagram showing admin
imports student list, generates accounts, assigns
practice, sends email invitations, students log in,
complete test, admin reviews statistics.