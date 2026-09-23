// BACKEND REMOVED — leadership data managed via static local dataset in js/pages/about.js. Reconnect when backend is rebuilt.

/**
 * THE CHURCH OF PENTECOST - ROYAL TEMPLE WORSHIP CENTRE
 * About Page Specific JavaScript (js/pages/about.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 1. Statement of Faith Accordion Logic
  // ==========================================================================
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const accordionItem = header.parentElement;
      const content = header.nextElementSibling;
      const isExpanded = header.getAttribute('aria-expanded') === 'true';

      // Close all active items
      document.querySelectorAll('.accordion-item').forEach(item => {
        if (item !== accordionItem) {
          item.classList.remove('active');
          const itemHeader = item.querySelector('.accordion-header');
          const itemContent = item.querySelector('.accordion-content');
          if (itemHeader && itemContent) {
            itemHeader.setAttribute('aria-expanded', 'false');
            itemContent.style.maxHeight = null;
          }
        }
      });

      // Toggle clicked item
      if (!isExpanded) {
        accordionItem.classList.add('active');
        header.setAttribute('aria-expanded', 'true');
        content.style.maxHeight = content.scrollHeight + 'px';
      } else {
        accordionItem.classList.remove('active');
        header.setAttribute('aria-expanded', 'false');
        content.style.maxHeight = null;
      }
    });
  });

  // Open first accordion item by default
  if (accordionHeaders.length > 0) {
    accordionHeaders[0].click();
  }

  // ==========================================================================
  // 2. Leadership Section Static Data & Renderer
  // ==========================================================================
  const leadershipData = {
    pastoralPair: {
      names: "Pastor Emmanuel K. & Mrs. Florence Ofori",
      role: "Resident Pastor & Wife",
      photo: "assets/images/welcome-pastor.jpg",
      bio: "Pastor Emmanuel K. Ofori and Mrs. Florence Ofori serve together as the Resident Pastoral Couple at Royal Temple Worship Centre. With over 15 years of ordained ministry in The Church of Pentecost, they shepherd the congregation through anointed expository preaching, pastoral care, and family life mentorship."
    },
    executive: [
      {
        name: "Elder Samuel Mensah",
        role: "Presiding Elder",
        photo: "assets/images/hero.jpg",
        bio: "Assists the Resident Pastor in local executive administration, presbytery governance, and pastoral oversight of home cell fellowship networks."
      },
      {
        name: "Elder Isaac Owusu",
        role: "Church Secretary",
        photo: "assets/images/sermon-latest.jpg",
        bio: "Manages administrative communications, record keeping, district documentation, and secretarial coordination for executive meetings."
      }
    ],
    elders: [
      {
        name: "Elder Kwaku Boateng",
        role: "Elder",
        photo: "assets/images/sermon-latest.jpg",
        bio: "Serves in local soul winning, evangelism outreach logistics, and new convert follow-up."
      },
      {
        name: "Elder Joseph Addai",
        role: "Elder",
        photo: "assets/images/hero.jpg",
        bio: "Coordinates family life initiatives, marital counseling, and member visitation teams."
      },
      {
        name: "Elder Michael Tetteh",
        role: "Elder",
        photo: "assets/images/welcome-pastor.jpg",
        bio: "Supports presbytery governance, church discipline, and stewardship of assembly finances."
      },
      {
        name: "Elder Daniel Kumi",
        role: "Elder",
        photo: "assets/images/hero.jpg",
        bio: "Oversees church building projects, safety protocols, and infrastructure maintenance."
      }
    ],
    deaconsDeaconesses: [
      {
        name: "Deaconess Grace Addo",
        role: "Head Deaconess",
        photo: "assets/images/welcome-pastor.jpg",
        bio: "Leads sanctuary welfare operations, hospitality decorum, and communion logistics."
      },
      {
        name: "Deacon Benjamin Annan",
        role: "Deacon",
        photo: "assets/images/hero.jpg",
        bio: "Oversees sanctuary maintenance, audio-visual technical equipment, and event setup."
      },
      {
        name: "Deaconess Mercy Mensah",
        role: "Deaconess",
        photo: "assets/images/sermon-latest.jpg",
        bio: "Directs compassionate care visits, hospital outreach, and member welfare support."
      },
      {
        name: "Deacon Thomas Owiredu",
        role: "Deacon",
        photo: "assets/images/sermon-latest.jpg",
        bio: "Coordinates offering collections, ushering support, and crowd flow during services."
      }
    ],
    ministryLeaders: [
      {
        name: "Elder Kwame Asante",
        role: "Men's Leader",
        ministry: "Men's Ministry (PEMEM)",
        anchor: "ministries.html#pemem",
        photo: "assets/images/hero.jpg",
        bio: "Leads monthly men's breakfasts, spiritual retreats, and kingdom stewardship workshops."
      },
      {
        name: "Deaconess Grace Addo",
        role: "Women's Leader",
        ministry: "Women's Ministry",
        anchor: "ministries.html#womens",
        photo: "assets/images/welcome-pastor.jpg",
        bio: "Coordinates women's prayer meetings, maiden mentorship, and community charity."
      },
      {
        name: "Bro. Daniel Osei",
        role: "Youth Leader",
        ministry: "Youth Ministry (PYFM)",
        anchor: "ministries.html#pyfm",
        photo: "assets/images/sermon-latest.jpg",
        bio: "Empowers teenagers and young adults through youth revivals, sports galas, and mentoring."
      },
      {
        name: "Sis. Abigail Baah",
        role: "PENSA President",
        ministry: "Campus & Student Ministry (PENSA)",
        anchor: "ministries.html#pensa",
        photo: "assets/images/hero.jpg",
        bio: "Mobilizes tertiary and secondary students for campus evangelism and academic excellence."
      },
      {
        name: "Deaconess Hannah Appiah",
        role: "Sunday School Superintendent",
        ministry: "Children's Ministry (Kingdom Kids)",
        anchor: "ministries.html#children",
        photo: "assets/images/welcome-pastor.jpg",
        bio: "Guides Sunday school teachers in providing Christ-centered lessons for ages 2 to 12."
      },
      {
        name: "Bro. Emmanuel Mensah",
        role: "Music Director",
        ministry: "Choir & Praise Team (Royal Voices)",
        anchor: "ministries.html#choir",
        photo: "assets/images/sermon-latest.jpg",
        bio: "Directs sanctuary music rehearsals, choir arrangements, and Sunday worship encounters."
      },
      {
        name: "Elder Kwaku Boateng",
        role: "Evangelism Leader",
        ministry: "Evangelism & Missions",
        anchor: "ministries.html#evangelism",
        photo: "assets/images/sermon-latest.jpg",
        bio: "Spearheads open-air crusades, door-to-door evangelism, and rural church planting."
      },
      {
        name: "Bro. Stephen Kwarteng",
        role: "Ushering Commander",
        ministry: "Ushering & Protocol Board",
        anchor: "ministries.html#ushering",
        photo: "assets/images/hero.jpg",
        bio: "Coordinates sanctuary ushering, guest welcoming, and order during all church services."
      },
      {
        name: "Elder Isaac Owusu",
        role: "Prayer Force Commander",
        ministry: "Prayer Force Ministry",
        anchor: "ministries.html#prayer",
        photo: "assets/images/sermon-latest.jpg",
        bio: "Leads Friday all-night prayer vigils and coordinates intercessory prayer request queues."
      }
    ]
  };

  // Render Pastoral Pair
  const pairContainer = document.getElementById('pastoral-pair-container');
  if (pairContainer && leadershipData.pastoralPair) {
    const pair = leadershipData.pastoralPair;
    pairContainer.innerHTML = `
      <article class="leader-card pastor-featured-card">
        <div class="pastor-featured-image-box">
          <img src="${pair.photo}" alt="${pair.names}" class="pastor-featured-img">
          <span class="leader-role-badge badge-gold">${pair.role}</span>
        </div>
        <div class="pastor-featured-body">
          <span class="section-tag">Sanctuary Resident Shepherds</span>
          <h3 class="pastor-featured-name">${pair.names}</h3>
          <div class="leader-title">${pair.role}</div>
          <p class="leader-bio">${pair.bio}</p>
        </div>
      </article>
    `;
  }

  // Render Executive Leaders (Presiding Elder & Secretary)
  const execContainer = document.getElementById('executive-leadership-container');
  if (execContainer && leadershipData.executive) {
    execContainer.innerHTML = leadershipData.executive.map(exec => `
      <article class="leader-card leader-card-executive">
        <div class="leader-image-box">
          <img src="${exec.photo}" alt="${exec.name}" class="leader-img">
          <span class="leader-role-badge">${exec.role}</span>
        </div>
        <div class="leader-card-body">
          <h3 class="leader-name">${exec.name}</h3>
          <div class="leader-title">${exec.role}</div>
          <p class="leader-bio">${exec.bio}</p>
        </div>
      </article>
    `).join('');
  }

  // Render Presbytery (Elders, Deacons & Deaconesses)
  const renderLeaderGrid = (containerId, leaders) => {
    const container = document.getElementById(containerId);
    if (!container || !leaders) return;
    container.innerHTML = leaders.map(leader => `
      <article class="leader-card">
        <div class="leader-image-box">
          <img src="${leader.photo}" alt="${leader.name}" class="leader-img">
          <span class="leader-role-badge">${leader.role}</span>
        </div>
        <div class="leader-card-body">
          <h3 class="leader-name">${leader.name}</h3>
          <div class="leader-title">${leader.role}</div>
          <p class="leader-bio">${leader.bio}</p>
        </div>
      </article>
    `).join('');
  };

  renderLeaderGrid('elders-container', leadershipData.elders);
  renderLeaderGrid('deacons-container', leadershipData.deaconsDeaconesses);

  // Render Ministry Leaders
  const ministryContainer = document.getElementById('ministry-leaders-container');
  if (ministryContainer && leadershipData.ministryLeaders) {
    ministryContainer.innerHTML = leadershipData.ministryLeaders.map(leader => `
      <article class="leader-card leader-card-ministry">
        <div class="leader-image-box">
          <img src="${leader.photo}" alt="${leader.name}" class="leader-img">
          <span class="leader-role-badge badge-navy">${leader.role}</span>
        </div>
        <div class="leader-card-body">
          <h3 class="leader-name">${leader.name}</h3>
          <div class="leader-ministry-tag">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
            ${leader.ministry}
          </div>
          <p class="leader-bio">${leader.bio}</p>
          <div class="leader-action">
            <a href="${leader.anchor}" class="btn-link-gold">
              View ${leader.ministry} &rarr;
            </a>
          </div>
        </div>
      </article>
    `).join('');
  }
});
