// =====================
// Utility Functions
// =====================

/**
 * Format minutes as 'Xh Ym' or 'Z min'.
 */
function formatTime(minutes) {
    if (minutes < 60) {
        return `${minutes} min`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
}

/**
 * Show a success message in the popup.
 */
function showSuccess(message) {
    // Remove existing success/error messages
    const existingMessages = document.querySelectorAll('.success, .error');
    existingMessages.forEach(msg => msg.remove());
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    document.getElementById('content').appendChild(successDiv);
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}

/**
 * Show an error message in the popup.
 */
function showError(message) {
    // Remove existing success/error messages
    const existingMessages = document.querySelectorAll('.success, .error');
    existingMessages.forEach(msg => msg.remove());
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.getElementById('content').appendChild(errorDiv);
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// =====================
// Main Popup Logic (IIFE)
// =====================

(function() {
    // DOMContentLoaded logic and all main code inside IIFE
    document.addEventListener('DOMContentLoaded', function() {
        // DOM Elements
        const analyzeBtn = document.getElementById('analyzeBtn');
        const exportBtn = document.getElementById('exportBtn');
        const todayLessonsBtn = document.getElementById('todayLessonsBtn');
        const statsDiv = document.getElementById('stats');
        const courseDetailsDiv = document.getElementById('courseDetails');
        const targetCard = document.getElementById('targetCard');
        const targetToggle = document.getElementById('targetToggle');
        const targetSettings = document.getElementById('targetSettings');
        const dailyTargetInput = document.getElementById('dailyTargetInput');
        
        let courseData = null;
        let dailyTarget = 30; // Default 30 minutes per day
        
        // Load saved daily target if available
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['dailyTarget']).then(function(result) {
                if (result.dailyTarget) {
                    dailyTarget = result.dailyTarget;
                    dailyTargetInput.value = dailyTarget;
                }
            }).catch(function(error) {
                console.warn('Could not load daily target from storage:', error);
            });
        }
        
        // Event listeners
        analyzeBtn.addEventListener('click', analyzeCourse);
        exportBtn.addEventListener('click', exportCourseData);
        todayLessonsBtn.addEventListener('click', copyTodayLessons);
        targetToggle.addEventListener('click', toggleTargetSettings);
        dailyTargetInput.addEventListener('input', updateDailyTarget);
        dailyTargetInput.addEventListener('change', updateDailyTarget);

        // =====================
        // UI/Settings Functions
        // =====================

        function toggleTargetSettings() {
            const isExpanded = targetSettings.classList.contains('expanded');
            if (isExpanded) {
                targetSettings.classList.remove('expanded');
                targetToggle.textContent = '⚙️ Settings';
            } else {
                targetSettings.classList.add('expanded');
                targetToggle.textContent = '✖️ Close';
            }
        }

        function updateDailyTarget() {
            const newTarget = parseInt(dailyTargetInput.value) || 30;
            dailyTarget = Math.max(1, Math.min(1440, newTarget)); // Clamp between 1 and 1440
            if (dailyTargetInput.value != dailyTarget) {
                dailyTargetInput.value = dailyTarget;
            }
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set({dailyTarget: dailyTarget}).catch(function(error) {
                    console.warn('Could not save daily target to storage:', error);
                });
            }
            if (courseData) {
                updateTargetCalculations();
            }
        }

        function updateTargetCalculations() {
            if (!courseData) return;
            let completedTime = 0;
            courseData.sections.forEach(section => {
                section.lessons.forEach(lesson => {
                    if (lesson.isComplete) {
                        completedTime += lesson.duration;
                    }
                });
            });
            const remainingTime = Math.max(0, courseData.totalTimeMinutes - completedTime);
            if (remainingTime <= 0) {
                document.getElementById('daysToComplete').textContent = '0';
                document.getElementById('dailyNeeded').textContent = '0 min';
                document.getElementById('weeklyHours').textContent = '0h';
                document.getElementById('completionDate').textContent = 'Complete!';
                return;
            }
            const daysToComplete = Math.ceil(remainingTime / dailyTarget);
            const weeklyHours = (dailyTarget * 7) / 60;
            const completionDate = new Date();
            completionDate.setDate(completionDate.getDate() + daysToComplete);
            document.getElementById('daysToComplete').textContent = daysToComplete;
            document.getElementById('dailyNeeded').textContent = `${Math.ceil(remainingTime / daysToComplete)} min`;
            document.getElementById('weeklyHours').textContent = `${weeklyHours.toFixed(1)}h`;
            document.getElementById('completionDate').textContent = completionDate.toLocaleDateString();
        }

        // =====================
        // Lesson/Export Functions
        // =====================

        function getTodayLessons() {
            if (!courseData) return null;
            const todayLessons = [];
            let targetTimeRemaining = dailyTarget;
            for (const section of courseData.sections) {
                for (const lesson of section.lessons) {
                    if (!lesson.isComplete && targetTimeRemaining > 0) {
                        const lessonDuration = lesson.duration || 0;
                        if (lessonDuration === 0) {
                            todayLessons.push({
                                ...lesson,
                                sectionTitle: section.title,
                                estimatedDuration: 5
                            });
                            targetTimeRemaining -= 5;
                        } else if (lessonDuration <= targetTimeRemaining) {
                            todayLessons.push({
                                ...lesson,
                                sectionTitle: section.title
                            });
                            targetTimeRemaining -= lessonDuration;
                        } else if (todayLessons.length === 0) {
                            todayLessons.push({
                                ...lesson,
                                sectionTitle: section.title,
                                exceedsTarget: true
                            });
                            targetTimeRemaining = 0;
                        } else {
                            break;
                        }
                    }
                    if (targetTimeRemaining <= 0) break;
                }
                if (targetTimeRemaining <= 0) break;
            }
            return {
                lessons: todayLessons,
                totalTime: dailyTarget - targetTimeRemaining,
                targetTime: dailyTarget,
                timeRemaining: Math.max(0, targetTimeRemaining)
            };
        }

        function copyTodayLessons() {
            if (!courseData) {
                showError('Please analyze the course first');
                return;
            }
            const todayData = getTodayLessons();
            if (!todayData || todayData.lessons.length === 0) {
                showError('No incomplete lessons found or course is already complete!');
                return;
            }
            const today = new Date().toLocaleDateString();
            let todayText = `📚 Today's Study Plan - ${today}\n`;
            todayText += `📖 Lessons to Complete: ${todayData.lessons.length}\n\n`;
            todayText += `Lesson List:\n`;
            todayText += `-----------\n`;
            let currentSection = '';
            todayData.lessons.forEach((lesson, index) => {
                if (lesson.sectionTitle !== currentSection) {
                    currentSection = lesson.sectionTitle;
                    todayText += `\n📁 ${currentSection}\n`;
                }
                const timeInfo = lesson.duration > 0 ? 
                    ` (${formatTime(Math.round(lesson.duration))})` : 
                    lesson.estimatedDuration ? ` (~${lesson.estimatedDuration} min)` : '';
                const exceedsNote = lesson.exceedsTarget ? ' 🔥 Exceeds daily target' : '';
                todayText += `- [ ] ${index + 1}. ${lesson.title}${timeInfo}${exceedsNote}\n`;
            });
            navigator.clipboard.writeText(todayText).then(() => {
                todayLessonsBtn.textContent = '✅ Copied!';
                setTimeout(() => {
                    todayLessonsBtn.textContent = '📚 Copy Today\'s Lessons';
                }, 2000);
                showSuccess(`Copied ${todayData.lessons.length} lessons for today (${Math.round(todayData.totalTime)} min)`);
            }).catch(() => {
                showError('Failed to copy to clipboard');
            });
        }

        function exportCourseData() {
            if (!courseData) return;
            let completedTime = 0;
            let completedLessons = 0;
            courseData.sections.forEach(section => {
                section.lessons.forEach(lesson => {
                    if (lesson.isComplete) {
                        completedLessons++;
                        completedTime += lesson.duration;
                    }
                });
            });
            const remainingTime = courseData.totalTimeMinutes - completedTime;
            const progressPercent = courseData.totalTimeMinutes > 0 ? 
                Math.round((completedTime / courseData.totalTimeMinutes) * 100) : 0;
            const daysToComplete = remainingTime > 0 ? Math.ceil(remainingTime / dailyTarget) : 0;
            let exportText = `Course Analysis Report\n`;
            exportText += `========================\n\n`;
            exportText += `Total Sections: ${courseData.sections.length}\n`;
            exportText += `Total Lessons: ${courseData.totalLessons}\n`;
            exportText += `Completed Lessons: ${completedLessons}\n`;
            exportText += `Timed Lessons: ${courseData.timedLessons}\n`;
            exportText += `Total Time: ${formatTime(Math.round(courseData.totalTimeMinutes))}\n`;
            exportText += `Completed Time: ${formatTime(Math.round(completedTime))}\n`;
            exportText += `Remaining Time: ${formatTime(Math.round(remainingTime))}\n`;
            exportText += `Progress: ${progressPercent}%\n`;
            exportText += `Daily Target: ${dailyTarget} minutes\n`;
            exportText += `Estimated Days to Complete: ${daysToComplete}\n`;
            exportText += `Lessons Without Timing: ${courseData.totalLessons - courseData.timedLessons}\n\n`;
            exportText += `Section Details:\n`;
            exportText += `----------------\n`;
            courseData.sections.forEach((section, index) => {
                const sectionCompletedCount = section.lessons.filter(lesson => lesson.isComplete).length;
                const sectionCompletedTime = section.lessons
                    .filter(lesson => lesson.isComplete)
                    .reduce((sum, lesson) => sum + lesson.duration, 0);
                const sectionRemainingTime = section.actualTime - sectionCompletedTime;
                const sectionProgress = section.actualTime > 0 ? 
                    Math.round((sectionCompletedTime / section.actualTime) * 100) : 0;
                const timedCount = section.lessons.filter(lesson => lesson.duration > 0).length;
                const progressInfo = sectionCompletedCount > 0 ? ` (${sectionCompletedCount}/${section.lessons.length} completed - ${sectionProgress}%)` : '';
                exportText += `\n${index + 1}. ${section.title}${progressInfo}\n`;
                exportText += `   Total Lessons: ${section.lessons.length} (${timedCount} timed)\n`;
                exportText += `   Total Time: ${section.actualTime > 0 ? formatTime(section.actualTime.toFixed(2)) : 'No timing info'}\n`;
                if (sectionCompletedTime > 0) {
                    exportText += `   Completed Time: ${formatTime(sectionCompletedTime.toFixed(2))}\n`;
                }
                if (sectionRemainingTime > 0) {
                    exportText += `   Remaining Time: ${formatTime(sectionRemainingTime.toFixed(2))}\n`;
                }
                exportText += `   Lessons:\n`;
                section.lessons.forEach((lesson, lessonIndex) => {
                    const status = lesson.isComplete ? '✅' : '⏳';
                    const timeInfo = lesson.duration > 0 ? ` (${formatTime(lesson.duration.toFixed(2))})` : '';
                    exportText += `   ${status} ${lessonIndex + 1}. ${lesson.title}${timeInfo}\n`;
                });
                exportText += `\n`;
            });
            navigator.clipboard.writeText(exportText).then(() => {
                exportBtn.textContent = '✅ Copied!';
                setTimeout(() => {
                    exportBtn.textContent = '📋 Copy Course Data';
                }, 2000);
            }).catch(() => {
                showError('Failed to copy to clipboard');
            });
        }

        // =====================
        // Section Copy Functions
        // =====================

        function copySectionData(sectionIndex) {
            if (!courseData || !courseData.sections[sectionIndex]) return;
            const section = courseData.sections[sectionIndex];
            const completedCount = section.lessons.filter(lesson => lesson.isComplete).length;
            const timedLessons = section.lessons.filter(lesson => lesson.duration > 0).length;
            const completedTime = section.lessons
                .filter(lesson => lesson.isComplete)
                .reduce((sum, lesson) => sum + lesson.duration, 0);
            const remainingTime = section.actualTime - completedTime;
            const progressPercent = section.actualTime > 0 ? 
                Math.round((completedTime / section.actualTime) * 100) : 0;
            let sectionText = `Section: ${section.title}\n`;
            sectionText += `==========================================\n`;
            sectionText += `Total Lessons: ${section.lessons.length}\n`;
            sectionText += `Timed Lessons: ${timedLessons}\n`;
            sectionText += `Completed: ${completedCount}/${section.lessons.length}\n`;
            sectionText += `Total Time: ${section.actualTime > 0 ? formatTime(section.actualTime) : 'No timing info'}\n`;
            if (completedTime > 0) {
                sectionText += `Completed Time: ${formatTime(completedTime)}\n`;
            }
            if (remainingTime > 0) {
                sectionText += `Remaining Time: ${formatTime(remainingTime)}\n`;
            }
            sectionText += `Progress: ${progressPercent}%\n\n`;
            sectionText += `Lesson Details:\n`;
            sectionText += `---------------\n`;
            section.lessons.forEach((lesson, index) => {
                const status = lesson.isComplete ? '✅' : '⏳';
                const timeInfo = lesson.duration > 0 ? ` (${formatTime(lesson.duration)})` : '';
                sectionText += `${status} ${index + 1}. ${lesson.title}${timeInfo}\n`;
            });
            copyToClipboard(sectionText, sectionIndex, 'data');
        }

        function copySectionTitles(sectionIndex) {
            if (!courseData || !courseData.sections[sectionIndex]) return;
            const section = courseData.sections[sectionIndex];
            let titlesText = `${section.title} - Lesson Titles:\n`;
            titlesText += `${'='.repeat(section.title.length + 18)}\n`;
            section.lessons.forEach((lesson, index) => {
                const status = lesson.isComplete ? '✅ ' : '';
                titlesText += `${status}${index + 1}. ${lesson.title}\n`;
            });
            copyToClipboard(titlesText, sectionIndex, 'titles');
        }

        function copyToClipboard(text, sectionIndex, type) {
            navigator.clipboard.writeText(text).then(() => {
                const buttons = document.querySelectorAll(`[data-section-index="${sectionIndex}"] .section-btn`);
                const targetButton = type === 'data' ? buttons[0] : buttons[1];
                if (targetButton) {
                    const originalText = targetButton.textContent;
                    targetButton.textContent = '✅ Copied!';
                    targetButton.classList.add('success');
                    setTimeout(() => {
                        targetButton.textContent = originalText;
                        targetButton.classList.remove('success');
                    }, 2000);
                }
            }).catch(() => {
                showError('Failed to copy to clipboard');
            });
        }

        // =====================
        // Section/Details UI
        // =====================

        function displayResults(data) {
            if (!data || !data.sections) {
                showError('Invalid course data received');
                return;
            }
            let completedTime = 0;
            let completedLessons = 0;
            data.sections.forEach(section => {
                if (section.lessons) {
                    section.lessons.forEach(lesson => {
                        if (lesson.isComplete) {
                            completedLessons++;
                            completedTime += lesson.duration || 0;
                        }
                    });
                }
            });
            const remainingTime = Math.max(0, data.totalTimeMinutes - completedTime);
            const progressPercent = data.totalTimeMinutes > 0 ? 
                Math.round((completedTime / data.totalTimeMinutes) * 100) : 0;
            document.getElementById('sectionCount').textContent = data.sections.length;
            document.getElementById('lessonCount').textContent = data.totalLessons || 0;
            document.getElementById('completedLessonCount').textContent = completedLessons;
            document.getElementById('timedLessonCount').textContent = data.timedLessons || 0;
            document.getElementById('totalTime').textContent = formatTime(Math.round(data.totalTimeMinutes || 0));
            document.getElementById('completedTime').textContent = formatTime(Math.round(completedTime));
            document.getElementById('remainingTime').textContent = formatTime(Math.round(remainingTime));
            document.getElementById('progressPercent').textContent = `${progressPercent}%`;
            const progressFill = document.getElementById('progressFill');
            progressFill.style.width = `${progressPercent}%`;
            statsDiv.style.display = 'block';
            targetCard.style.display = 'block';
            updateTargetCalculations();
            displayCourseDetails(data);
            exportBtn.style.display = 'block';
            todayLessonsBtn.style.display = 'block';
            const timingInfo = data.timedLessons < data.totalLessons ? 
                ` (${data.totalLessons - data.timedLessons} lessons without timing)` : '';
            const progressInfo = completedLessons > 0 ? 
                ` • ${completedLessons} completed (${progressPercent}%)` : '';
            showSuccess(`Found ${data.sections.length} sections with ${data.totalLessons} lessons${timingInfo}${progressInfo}!`);
        }

        function displayCourseDetails(data) {
            let detailsHTML = '';
            data.sections.forEach((section, sectionIndex) => {
                if (!section.lessons) return;
                const sectionCompletedLessons = section.lessons.filter(lesson => lesson.isComplete).length;
                const timedLessons = section.lessons.filter(lesson => (lesson.duration || 0) > 0).length;
                const sectionCompletedTime = section.lessons
                    .filter(lesson => lesson.isComplete)
                    .reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
                const sectionTotalTime = section.actualTime || 0;
                const sectionRemainingTime = Math.max(0, sectionTotalTime - sectionCompletedTime);
                const sectionProgress = sectionTotalTime > 0 ? 
                    Math.round((sectionCompletedTime / sectionTotalTime) * 100) : 0;
                const progressText = sectionCompletedLessons > 0 ? ` • ${sectionCompletedLessons}/${section.lessons.length} completed` : '';
                const timeText = sectionTotalTime > 0 ? formatTime(Math.round(sectionTotalTime)) : 'No timing info';
                const completedTimeText = sectionCompletedTime > 0 ? ` • ✅ ${formatTime(Math.round(sectionCompletedTime))}` : '';
                const remainingTimeText = sectionRemainingTime > 0 ? ` • ⏳ ${formatTime(Math.round(sectionRemainingTime))}` : '';
                detailsHTML += `
                    <div class="section-item" data-section-index="${sectionIndex}">
                        <div class="section-header">
                            <div class="section-info">
                                <div class="section-title">${section.title || 'Untitled Section'}</div>
                                <div class="lesson-count">${section.lessons.length} lessons (${timedLessons} timed) • ${timeText}${progressText}</div>
                                ${sectionCompletedTime > 0 || sectionRemainingTime > 0 ? 
                                    `<div class="section-progress">${sectionProgress}% complete${completedTimeText}${remainingTimeText}</div>` : 
                                    ''}
                            </div>
                            <div class="section-controls">
                                <button class="section-btn" data-action="copy-data" data-section="${sectionIndex}" title="Copy section with details">📋 Data</button>
                                <button class="section-btn" data-action="copy-titles" data-section="${sectionIndex}" title="Copy lesson titles only">📝 Titles</button>
                                <div class="expand-icon">▶</div>
                            </div>
                        </div>
                        <div class="lessons-list" id="lessons-${sectionIndex}">
                            ${section.lessons.map(lesson => `
                                <div class="lesson-item">
                                    <div class="lesson-status ${lesson.isComplete ? 'completed' : 'incomplete'}"></div>
                                    <div class="lesson-title">${lesson.title || 'Untitled Lesson'}${(lesson.duration || 0) > 0 ? ` <span style=\"opacity: 0.7; font-size: 10px;\">(${formatTime(Math.round(lesson.duration))})</span>` : ''}</div>
                                </div>
                            `).join('')}
                            </div>
                    </div>
                `;
            });
            courseDetailsDiv.innerHTML = detailsHTML;
            courseDetailsDiv.style.display = 'block';
            addSectionClickHandlers();
            window.copySectionData = copySectionData;
            window.copySectionTitles = copySectionTitles;
            exportBtn.style.display = 'block';
            todayLessonsBtn.style.display = 'block';
        }

        function addSectionClickHandlers() {
            const sectionItems = document.querySelectorAll('.section-item');
            sectionItems.forEach(sectionItem => {
                const header = sectionItem.querySelector('.section-header');
                const sectionIndex = sectionItem.getAttribute('data-section-index');
                const lessonsList = document.getElementById(`lessons-${sectionIndex}`);
                const expandIcon = sectionItem.querySelector('.expand-icon');
                header.addEventListener('click', (e) => {
                    if (e.target.classList.contains('section-btn')) {
                        return;
                    }
                    e.preventDefault();
                    const isExpanded = lessonsList.classList.contains('expanded');
                    if (isExpanded) {
                        lessonsList.classList.remove('expanded');
                        expandIcon.classList.remove('expanded');
                        lessonsList.style.display = 'none';
                    } else {
                        lessonsList.classList.add('expanded');
                        expandIcon.classList.add('expanded');
                        lessonsList.style.display = 'block';
                    }
                });
            });
        }

        // =====================
        // Analyze Button Handler
        // =====================

        async function analyzeCourse() {
            try {
                analyzeBtn.textContent = '🔄 Analyzing...';
                analyzeBtn.disabled = true;
                if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
                    throw new Error('Chrome extension APIs not available');
                }
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tabs || tabs.length === 0) {
                    throw new Error('No active tab found');
                }
                const tab = tabs[0];
                if (!tab.url || (!tab.url.includes('programmingadvices.com/courses'))) {
                    throw new Error('Please navigate to a Teachable course page first');
                }
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: extractCourseData
                });
                if (!results || results.length === 0) {
                    throw new Error('No results returned from content script');
                }
                courseData = results[0].result;
                if (!courseData) {
                    throw new Error('No data returned from page analysis');
                }
                if (courseData.error) {
                    throw new Error(courseData.error);
                }
                displayResults(courseData);
            } catch (error) {
                console.error('Analysis error:', error);
                showError('Failed to analyze course: ' + error.message);
            } finally {
                analyzeBtn.textContent = '🔍 Analyze Course';
                analyzeBtn.disabled = false;
            }
        }
    });
})();

// =====================
// Content Script Extraction (for injection)
// =====================

function extractCourseData() {
    try {
        const sections = [];
        let totalLessons = 0;
        let totalTimeMinutes = 0;
        let timedLessons = 0;
        const sectionElements = document.querySelectorAll('.course-section');
        if (sectionElements.length === 0) {
            return {
                error: 'No course sections found. Make sure you\'re on a Teachable course page.'
            };
        }
        function parseTimeFromTitle(title) {
            const timeRegex = /\((\d{1,2}):(\d{2})\)$/;
            const match = title.match(timeRegex);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                return minutes + (seconds / 60);
            }
            return 0;
        }
        function cleanTitle(title) {
            return title.replace(/\s*\(\d{1,2}:\d{2}\)$/, '').trim();
        }
        sectionElements.forEach(sectionElement => {
            const sectionTitleElement = sectionElement.querySelector('.section-title');
            if (!sectionTitleElement) return;
            const sectionTitle = sectionTitleElement.textContent.trim();
            const lessons = [];
            let sectionTime = 0;
            const lessonElements = sectionElement.querySelectorAll('.section-item');
            lessonElements.forEach(lessonElement => {
                const lessonNameElement = lessonElement.querySelector('.lecture-name');
                if (lessonNameElement) {
                    const fullLessonTitle = lessonNameElement.textContent.trim();
                    const isComplete = lessonElement.classList.contains('completed') || 
                                     lessonElement.classList.contains('complete') ||
                                     lessonElement.querySelector('.completed') !== null ||
                                     lessonElement.querySelector('.fa-check') !== null ||
                                     lessonElement.querySelector('[class*="check"]') !== null;
                    const duration = parseTimeFromTitle(fullLessonTitle);
                    const cleanedTitle = cleanTitle(fullLessonTitle);
                    if (duration > 0) {
                        timedLessons++;
                        sectionTime += duration;
                    }
                    lessons.push({
                        title: cleanedTitle,
                        fullTitle: fullLessonTitle,
                        duration: duration,
                        id: lessonElement.getAttribute('data-lecture-id'),
                        url: lessonElement.getAttribute('data-lecture-url'),
                        isComplete: isComplete
                    });
                }
            });
            sections.push({
                title: sectionTitle,
                lessons: lessons,
                actualTime: sectionTime,
                estimatedTime: lessons.length * 10
            });
            totalLessons += lessons.length;
            totalTimeMinutes += sectionTime;
        });
        return {
            sections: sections,
            totalLessons: totalLessons,
            timedLessons: timedLessons,
            totalTimeMinutes: totalTimeMinutes,
            extractedAt: new Date().toISOString(),
            pageUrl: window.location.href
        };
    } catch (error) {
        return {
            error: 'Error extracting course data: ' + error.message
        };
    }
}